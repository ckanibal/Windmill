/*-- Lokalisierungsfunktionen --*/

function Locale(str, prefix, ...pars) {
	if(!prefix && prefix !== "")
		prefix = MODULE_LPRE;

	if(prefix == -1)
		prefix = "";

	if(!str)
		return str;


	var lgreplace = str.match(/\$[a-zA-Z0-9_]+?\$/g);
	for(var d in lgreplace) {
		var id = lgreplace[d];
		var str2 = __l[prefix+"_"+id.match(/\$([a-zA-Z0-9_]+?)\$/)[1]];
		
		if(str2)
			str = str.replace(RegExp(id.replace(/\$/g, "\\$")), str2.replace(/\\n/, "\n"));
	}

	if(arguments.length > 2)
		return sprintf(str, ...pars);

	return str;
}

//For keybindings
function localizeKeyString(keys) {
	if(!keys)
		return "";

	let core = keys.replace(/-?(Ctrl|Shift|Alt)-?/g, "");
	let modifier = (keys.replace(/-.+$/, "")+"-").replace(/(Ctrl|Alt|Shift)-/g, "$KEYCODE_$1$-");
	if(Locale("$KEYCODE_"+core+"$", -1)[0] != "$")
		core = Locale("$KEYCODE_"+core+"$", -1);
	//Search for position of "-"; if < 1 then there is no modifier active. (Because "-" is a valid keybinding..)
	if(keys.search(/-/) < 1)
		modifier = "";
	return Locale(modifier+core, -1);
}

function localizeModule(container) {
	let rgx = /\$(::)?[a-zA-Z0-9_]+?\$/g;
	
	function getReplacement(lgreplace) {
		let replacement = __l[MODULE_LPRE+"_"+lgreplace.replace(/\$/g, "")];
		if(replacement)
			replacement.replace(/\\n/, "\n");

		return replacement;
	}

	function fnLocale(i, obj) {
		//Keine Lokalisierung
		if($(obj).attr("data-no-localization"))
			return;

		//Attribute durchgehen
		jQuery.each(obj.attributes, function(j, attr) {
			if(!$(obj).attr(attr.name))
				return;

			let match = $(obj).attr(attr.name).match(rgx);
			if(match) {
				$(obj).attr(attr.name, $(obj).attr(attr.name).replace(rgx, (match) => {
					if(getReplacement(match))
						return getReplacement(match);
					else
						return match;
				}));
			}
		});

		//Textnodes durchgehen
		$(obj).contents().each(function() {
			if(this.nodeType == 3) {
				this.nodeValue = jQuery.trim($(this).text()).replace(rgx, (match) => {
					if(match.search(/^\$::/) != -1) {
						match = match.replace(/^\$::/, "$");
						let new_nodes = jQuery.parseHTML(getReplacement(match));
						for(let i = 0; i < new_nodes.length; i++)
							this.parentNode.insertBefore(new_nodes[i], this);

						this.parentNode.removeChild(this);
						return;
					}
					if(getReplacement(match))
						return getReplacement(match);
					else
						return match;
				});
			}
		});

		jQuery.each($(obj).children("*"), fnLocale);
	}

	if(!container) {
		if(MODULE_LANG == "html")
			container = $("body > *");
		else if(MODULE_LANG == "xul")
			container = $(document.documentElement).children("*");
	}
	jQuery.each(container, fnLocale);
}