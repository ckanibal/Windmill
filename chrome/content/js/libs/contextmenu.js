var CTX_MENUITEM_ID_COUNTER = 0;

/**
 * Erstellt und bindet ein Kontextmen� an eines (oder mehreren) Objekt.
 * ContextMenu(onShowing, entryarray, langpre, options)
 *  - [function] onShowing: 
 *      Callback kurz bevor das Menue erscheint. Uebergebener Parameter by_obj (Objekt auf das das Kontextmen� geoeffnet worden ist). 
 *      Wird in Objektkontext gecalled. (this = ContextMenu-Objekt)
 *  - [2d-array] entryarray: 
 *      2 dimensionales Array das die einzelnen Eintraege enthaelt. [[label, id, clickHandler, subMenu, options]] (s. addEntry)
 *      Kann auch als Eintrag "seperator" enthalten, um einen Seperator an der jeweiligen Stelle hinzuzufuegen.
 *  - [string] langpre:
 *      Lokalisierungspraefix das fuer das Kontextmen� genutzt wird.
 *  - [object] options:
 *      Objekt mit folgenden moeglichen Optionen:
 *        - [function] post_opening_callback: 
 *		      Callback der nach Oeffnen des Menues aufgerufen wird. Rest wie bei onShowing.
 *        - [[int] function] fnCheckVisibility:
 *            Funktion die fuer Sichtbarkeitschecks der Eintraege aufgerufen wird.
 *            Uebergebene Parameter:
 *              [object] obj_by: Objekt auf das das Kontextmen� geoeffnet worden ist
 *              [string] identifier: Identifier des jeweiligen Menueeintrag.
 *            Moegliche Rueckgabewerte:
 *              0: Eintrag normal sichtbar.
 *              1: Eintrag wird deaktiviert.
 *              2: Eintrag wird versteckt.
 *        - [bool] allowIcons:
 *            Falls true, zeigt Icons im Menue an.
 */

//:_.
const DIR_Right = 0, DIR_Left = 1;

class _ContextMenuEntry {
	constructor(topMenu, label, id, clickHandler, subMenu, langpre, options = {}) {
		this.label = Locale(label, langpre);
		this.id = CTX_MENUITEM_ID_COUNTER++;
		this.clickHandler = clickHandler;
		this.subMenu = subMenu;
		this.topMenu = topMenu;
		this.options = options;
		
		if(this.subMenu)
			this.subMenu.submenu = true;
		
		this.disabled = false;
		this.visible = true;
	}

	addEntryToObject(obj, target, inheritable_classes) {
		if(this.topMenu.getOption("fnCheckVisibility")) {
			var state = this.topMenu.getOption("fnCheckVisibility")(target, this.options.identifier);
			if(!state) {
				this.disabled = false;
				this.visible = true;
			}
			if(state == 1)
				this.disabled = true;
			if(state == 2)
				this.visible = false;
		}
	
		if(!this.visible)
			return false;
		
		var icon = "";
		if(this.topMenu.getOption("allowIcons")) {
			var icstr = "";
			let size = this.topMenu.options.iconsize || 20;
			if(this.options) {
				if(this.options.iconsrc) {
					if(MODULE_LANG == "xul")
						icstr = `<image src="${this.options.iconsrc}" width="${size}" height="${size}"/>`;
					else
						icstr = `<img src="${this.options.iconsrc}" />`;
				}
				else if(this.options.uicon) {
					if(MODULE_LANG == "xul")
						icstr = `<box class="${this.options.uicon} icon-${size}"></box>`;
					else
						icstr = `<div class="${this.options.uicon} icon-${size}"></div>`;
				}
			}
			
			if(MODULE_LANG == "xul")
				icon = `<hbox class="ctx-menuicon" width="${size}">${icstr}</hbox>`;
			else
				icon = `<div class="ctx-menuicon" style="width: ${size}px">${icstr}</div>`;
		}
		let other = "";
		//Check for further menu item information
		//(If only one item of the containing menu uses a specific option, all menuitems need to reserve space for it)
		if(this.topMenu.hasKeyBindings) {
			let keybinding = this.options.keybinding || "", keybind, kbid, keys;

			if(typeof keybinding == "object") {
				if(keybinding instanceof _KeyBinding) {
					kbid = keybinding.getIdentifier();
					keybind = keybinding;
				}
				else if(keybinding.id)
					kbid = keybinding.lpre+"_"+keybinding.id;
				else if(keybinding.label)
					keys = keybinding.label;
			}
			else
				kbid = this.options.langpre + "_" + keybinding;

			if(!keybind)
				keybind = getKeyBindingObjById(kbid);
			if(!keys)
				keys = _keybinderGetKeysByIdentifier(kbid);
			if(!keys)
				keys = keybind.defaultKeys;

			if(MODULE_LANG == "xul")
				other += `<vbox class="ctx-keybinding" width="90">${localizeKeyString(keys)}</vbox>`;
			else
				other += `<div class="ctx-keybinding">${localizeKeyString(keys)}</div>`;
		}
		if(this.topMenu.hasSubMenus) {
			let indicatorclasses = (this.subMenu && !this.options.hideSubMenuIcon)?" icon-16 icon-has-ctx-sub":"";
			if(this.subMenu && this.options.hideSubMenuIcon !== 2)
				indicatorclasses += " has-submenu";
			if(MODULE_LANG == "xul")
				other += `<hbox align="center"><vbox class="ctx-submenuindicator${indicatorclasses}"></vbox></hbox>`;
			else
				other += `<div class="ctx-submenuindicator${indicatorclasses}"></div>`;
		}

		//Element erstellen
		if(MODULE_LANG == "xul")
			this.element = $(`<hbox class="ctx-menuitem" id="context-${this.id}"><hbox class="ctx-prepend"></hbox>${icon}<vbox class="ctx-label">${this.label}</vbox><spacer flex="1"/><hbox class="ctx-special"></hbox>${other}</hbox>`)[0];
		else
			this.element = $(`<div class="ctx-menuitem" id="context-${this.id}"><div class="ctx-prepend"></div>${icon}${this.label}<div class="ctx-special"></div><div class="ctx-other">${other}</div></div>`)[0];

		if(this.options.classes)
			$(this.element).addClass(this.options.classes);

		if(this.options.onPreAppend)
			this.options.onPreAppend.call(this, this.element);

		$(this.element).appendTo($(obj));
		$(this.element).prop("ctx-menuitem-obj", this);
		
		//Ist Container bzw. hat Untermenue
		if(this.subMenu)
			$(this.element).addClass("ctx-container");

		//Further menu item types
		if(this.options.type) {
			switch(this.options.type.toLowerCase()) {
				case "radioitem":
					$(this.element).addClass("ctx-radioitem");
					$(this.element).attr("data-radiogroup", this.options.radiogroup);
					if(this.options.isSelected)
						$(this.element).addClass("ctx-menutype-selected");
					break;

				case "checklistitem":
					$(this.element).addClass("ctx-checklistitem");
					if(this.options.isSelected)
						$(this.element).addClass("ctx-menutype-selected");
					break;

				default:
					log("Contextmenu: Unrecognized type " + this.options.type, "error");
					break;
			}
		}

		//Add tooltips
		if(this.options.tooltip) {
			if(typeof this.options.tooltip == "string")
				tooltip(this.element, this.options.tooltip);
			else {
				let ttobj = this.options.tooltip;
				tooltip(this.element, ttobj.desc, ttobj.lang, ttobj.duration, ttobj);
			}
		}

		//ggf. deaktivieren
		if(this.disabled)
			$(this.element).addClass("ctx-disabled");
		else {
			$(this.element).hover((e) => { // Untermenue ggf. schlie�en
				var item = $(this.topMenu.element).find(".ctx-menuitem.selected");
				if(item[0] == e.target) // Nicht das eigene Menue
					return false;

				if(item[0]) { // Untermenue gefunden
					this.topMenu.getEntryById(parseInt(item.attr("id").replace(/context-/, ""))).hideMenu();
					$(this.topMenu.element).focus(); // Fokus wieder auf dieses Menue setzen
				}

				$(this.topMenu.element).find(".ctx-menuitem.selected").removeClass("selected");
			}, function() {});

			if(!this.subMenu || this.clickHandler) {
				//Execute click handlers
				$(this.element).click((e) => {
					//Do nothing if the menu is locked
					if($(e.target).hasClass("ctx-locked"))
						return;

					let preventMenuFromClosing = false;
					if(this.options.type) {
						switch(this.options.type.toLowerCase()) {
							case "radioitem":
								//Select this radioitem
								this.options.isSelected = true;
								//Remove selection classes on other menuitems and fire events
								$(this.topMenu.element).find('.ctx-menuitem.ctx-menutype-selected[data-radiogroup="'+this.options.radiogroup+'"]').removeClass("ctx-menutype-selected").not(this.element).trigger("change command");
								//Add selection class to this item and fire events
								$(this.element).addClass("ctx-menutype-selected");
								$(this.element).trigger("change command");
								preventMenuFromClosing = true;
								break;

							case "checklistitem":
								this.options.isSelected = !this.options.isSelected;
								$(this.element)[this.options.isSelected?"addClass":"removeClass"]("ctx-menutype-selected");
								$(this.element).trigger("change command");
								preventMenuFromClosing = true;
								break;
						}
					}

					//If the handler is a generator, lock the menu until the task is fulfilled
					if(this.clickHandler.isGenerator()) {
						let _this = this;
						Task.spawn(function*() {
							_this.lock();
							yield* _this.clickHandler(target, e, _this);
						}).then(function() {
							_this.unlock();
							if($(".contextmenu").prop("contextmenu_obj") && !preventMenuFromClosing)
								$(".contextmenu").prop("contextmenu_obj").hideMenu(_this.options.noFocusReset);
						}, function(err) {
							log(err);					
							_this.unlock();
							if($(".contextmenu").prop("contextmenu_obj") && !preventMenuFromClosing)
								$(".contextmenu").prop("contextmenu_obj").hideMenu(_this.options.noFocusReset);
						});	
					}
					else {
						this.clickHandler(target, e, this);
						if($(".contextmenu").prop("contextmenu_obj") && !preventMenuFromClosing)
							$(".contextmenu").prop("contextmenu_obj").hideMenu(this.options.noFocusReset);
					}
				});
			}
			this.inheritable_classes = inheritable_classes;
			if(this.subMenu && !this.options.preventSubMenuOnHover) {
				$(this.element).hover((e) => {
					this.openSubMenu(target);
				}, function() {});
			}
		}
	}

	openSubMenu(target, inheritable_classes = this.inheritable_classes) {
		if($(this.element).hasClass("ctx-locked"))
			return;
		if(jQuery.contains(document, this.subMenu.element))
			return;

		//Untermenue �ffnen
		$(this.element).addClass("selected");
		if(MODULE_LANG == "xul")
			this.subMenu.showMenu(0, 0, target, window.screenX+$(this.element).offset().left+$(this.element).outerWidth(), window.screenY+$(this.element).offset().top, this.element, this, inheritable_classes);
		else
			this.subMenu.showMenu($(this.element).offset().left+$(this.element).outerWidth(), $(this.element).offset().top, target, 0, 0, this.element, this, inheritable_classes);
	}

	hideMenu() {
		if(!this.subMenu)
			return;

		this.subMenu.hideMenu();
	}

	lock() {
		if(this.subMenu)
			this.subMenu.lock();
		else
			this.topMenu.lock();
	}

	unlock() {
		if(this.subMenu)
			this.subMenu.unlock();
		else
			this.topMenu.unlock();
	}
}
 
class _ContextMenu {
	constructor(onShowing, entryarray = [], langpre, options = {}) {				
		this.entries = [];
		this.showingSubMenu = 0;
		this.showing = onShowing;
		this.langpre = langpre;
		this.options = options;
		this.direction = DIR_Right;

		for(var i = 0; i < entryarray.length; i++) {
			var entry = entryarray[i];

			if(entry == "seperator")
				this.addSeperator();
			else
				this.addEntry(...entry);
		}
	}

	getOption(identifier) {
		return this.options[identifier];
	}

	addEntry(label, id, clickHandler, subMenu, options) {
		this.entries.push(new ContextMenuEntry(this, label, id, clickHandler, subMenu, this.langpre, options));
		return this.entries[this.entries.length];
	}
	clearEntries() { 
		this.entries.length = 0;
		return;
	}
	addSeperator() {
		this.entries.push(new ContextMenuEntry());
		this.entries[this.entries.length-1].seperator = true;
		return true;
	}
	getEntryById(id) {
		for(var i = 0; i < this.entries.length; i++) {
			if(this.entries[i] && this.entries[i].id == id)
				return this.entries[i];
		}
	}
	getEntryByIndex(index) {
		return this.entries[index];
	}
	bindToObj(obj, options = {}) {
		if(this.submenu)
			return false;

		let openDropDownMenu = false;
		//For drop down menus: You need to perform a full click (mousedown and mouseup) to open it.
		//That way it does not open itself again if you click on the click target with the intention to close the menu.
		$(obj).mousedown(e => {
			if(!options.dropdown)
				return;

			let lmb = options.leftmousebutton;
			//Default to left mouse button for drop down menus. (For deactivation, set leftmousebutton to false)
			if(options.dropdown && lmb === undefined)
				lmb = true;

			if(e.button == 2*!(lmb))
				openDropDownMenu = true;
		});
		$(obj).mouseup(e => {
			let lmb = options.leftmousebutton;
			//Default to left mouse button for drop down menus. (For deactivation, set leftmousebutton to false)
			if(options.dropdown && lmb === undefined)
				lmb = true;

			//Open context menu on right click (or left click if specified)
			if(e.button == 2*!(lmb)) {
				if(options.dropdown && !openDropDownMenu)
					return;
				openDropDownMenu = false;
				if(!options.classes)
					options.classes = "";
				let mx = e.clientX, my = e.clientY;
				let scx = e.screenX, scy = e.screenY;
				//For dropdown menus: spawn the menu below the element
				if(options.dropdown) {
					let offset = $(obj).offset();
					mx = offset.left;
					my = offset.top+$(obj).height();
					if(MODULE_LANG = "xul") {
						scx = $(obj)[0].ownerDocument.documentElement.boxObject.screenX+mx;
						scy = $(obj)[0].ownerDocument.documentElement.boxObject.screenY+my;
					}
					options.classes += " ctx-dropdown";
			 	}
				this.showMenu(mx, my, e.currentTarget, scx, scy, undefined, undefined, options.classes);
				return !options.forced;
			}

			return true;
		});
	}
	showMenu(x, y, obj_by, screenX, screenY, menuitem, menuitemobj, inheritable_classes) { // Kontextmen� anzeigen
		let classes = " ";
		if(this.options.classes)
			classes += this.options.classes + " ";
		if(inheritable_classes)
			classes += inheritable_classes;

		this.opened_by = obj_by;
		if(!this.submenu)
			if($(".contextmenu").prop("contextmenu_obj"))
				$(".contextmenu").prop("contextmenu_obj").hideMenu();

		if(typeof this.showing == "function")
			this.showing(obj_by);

		if(menuitemobj && menuitemobj.topMenu)
			this.topMenu = menuitemobj.topMenu;

		if(MODULE_LANG == "xul") {
			this.element = $('<panel class="contextmenu'+classes+'" noautofocus="true"></panel>')[0];
			$(this.element).appendTo($(document.documentElement));
			this.element.openPopup();

			this.body = $('<vbox class="ctx-wrapper"></vbox>')[0];
			$(this.element).append(this.body);
			var last_element_seperator = false;

			for(var entry in this.entries) { // Men� f�llen
				if(this.entries[entry].seperator) {
					if(!last_element_seperator)
						$(this.body).append('<hbox class="ctx-menuseperator"></hbox>');
				}
				else if(this.entries[entry])
					this.entries[entry].addEntryToObject(this.body, obj_by, inheritable_classes);
				if(this.entries[entry].seperator || this.entries[entry].visible)
					last_element_seperator = this.entries[entry].seperator;
			}

			//bound in screen
			var pscr = _sc.screenmgr().screenForRect(screenX, screenY, 1, 1);
			var scx = {}, scy = {}, scwdt = {}, schgt = {};
			pscr.GetAvailRect(scx,scy,scwdt,schgt);
			if(this.options.useWindowBoundings) {
				let wsx = _mainwindow.screenX, wsy = _mainwindow.screenY, 
					wwdt = $(_mainwindow).width(),
					whgt = $(_mainwindow).height();
				if(scx.value+scwdt.value > wsx+wwdt)
					scwdt.value = wwdt;
				if(scy.value+schgt.value > wsy+whgt)
					schgt.value = whgt;
				//set x and y values after width and height (because they are used above)
				if(scx.value < wsx)
					scx.value = wsx;
				if(scy.value < wsy)
					scy.value = wsy;
			}
			if(screenX+$(this.element).outerWidth()-scx.value > scwdt.value || (menuitemobj && menuitemobj.topMenu.direction == DIR_Left)) {
				if(menuitem)
					screenX = Math.max(0, screenX-($(menuitem).outerWidth()+5+$(this.element).outerWidth()));
				else
					screenX = Math.max(0, scx.value+scwdt.value-$(this.element).outerWidth());

				this.direction = DIR_Left;
			}
			else if(!menuitem) {
				this.direction = DIR_Right;
			}

			if(screenY+$(this.element).outerHeight() > schgt.value)
				screenY -= $(this.element).outerHeight()-((schgt.value)-screenY);

			if(screenX||screenY)
				this.element.moveTo(screenX, screenY);
			else
				this.element.moveTo(x, y+$(this.element).outerHeight());
		}
		else {
			this.element = $('<div class="contextmenu'+classes+'" tabindex="-1"></div>')[0];
			$(this.element).appendTo($("body"));
			$(this.element).css("left", x+"px").css("top", y+"px");
			$(this.element).css("position", "absolute");
			var last_element_seperator = false;

			for(var entry in this.entries) { // Men� f�llen
				if(this.entries[entry].seperator) {
					if(!last_element_seperator)
						$(this.element).append('<hr class="ctx-menuseperator"></hr>');
				}
				else if(this.entries[entry])
					this.entries[entry].addEntryToObject(this.element, obj_by, inheritable_classes);
				if(this.entries[entry].seperator || this.entries[entry].visible)
					last_element_seperator = this.entries[entry].seperator;
			}
		}

		this.element.contextmenu_obj = this;
		/*$(this.element).focus();*/

		$(this.element).blur(() => {
			//Neuer Fokus wird nicht sofort gesetzt, daher um 1ms verz�gert pr�fen
			setTimeout(() => {
				if(!$(":focus").hasClass("contextmenu"))
					this.hideMenu();
			}, 1);
		});

		if(this.getOption("post_opening_callback"))
			this.options.post_opening_callback(obj_by);
	}
	hideMenu(noFocusReset) {
		if(!this.element)
			return;
		if(this.locked)
			return;

		for(var i = 0; i < this.entries.length; i++)
			this.entries[i].hideMenu();

		if(MODULE_LANG == "XUL")
			this.element.hidePopup();
		else
			$(this.element).remove();
		this.element = 0;

		if(!noFocusReset)
			$(this.opened_by).focus();

		this.opened_by = 0;
	}
	
	lock() {
		$(this.element).find(".ctx-menuitem").addClass("ctx-locked");
		this.locked = true;
		if(this.topMenu)
			this.topMenu.lock();
	}
	
	unlock() {
		$(this.element).find(".ctx-menuitem.ctx-locked").removeClass("ctx-locked");
		this.locked = false;
		if(this.topMenu)
			this.topMenu.unlock();
	}
	
	set topMenu(val) { this._topMenu = val; }
	get topMenu() {
		if(!this.element)
			return;
		return this._topMenu;
	}

	/*-- For reserving space in the menuitems --*/
	get hasKeyBindings() {
		for(let entry of this.entries) {
			if(typeof entry != "object")
				continue;
			if(!entry.visible)
				continue;
			if(entry.options.keybinding)
				return true;
		}
		return false;
	}
	get hasSubMenus() {
		for(let entry of this.entries) {
			if(typeof entry != "object")
				continue;
			if(!entry.visible)
				continue;
			if(entry.subMenu)
				return true;
		}
		return false;
	}
}

function ContextMenu(...pars) { return new _ContextMenu(...pars); }
function ContextMenuEntry(...pars) { return new _ContextMenuEntry(...pars); }
