let api = '/api';
let key = null;

const example = '{"begprompt":"1girl, {{kirisame marisa}}, {{kakure eria, sangbob}}","including":"1girl, ~speech bubble, ~commentary, ~blood, ~gun, ~guro, ~bdsm, ~shibari, ~butt plug, ~object insertion, ~pregnant","removeArtist":true,"removeCharacter":true,"removeCopyright":true,"endprompt":"{{{volumetric lighting, depth of field, best quality, amazing quality, very aesthetic, highres, incredibly absurdres}}}","negativePrompt":"{{{worst quality, bad quality}}}, text, error, extra digit, fewer digits, jpeg artifacts, signature, watermark, username, reference, unfinished, unclear fingertips, twist, Squiggly, Grumpy, incomplete, {{Imperfect Fingers}}, Cheesy, very displeasing}}, {{mess}}, {{Approximate}}, {{Sloppiness}}, Glazed eyes, watermark, username, text, signature, fat, sagged breasts","width":"832","height":"1216","step":"28","promptGuidance":"5","promptGuidanceRescale":"0","seed":"","sampler":"Euler Ancestral","smea":true,"dyn":false,"delay":"8","automation":false,"autodownload":false}';

let artistList;
let characterList;
let whitelist;
let censorList;
let copyrightList;
let whitelistSeparated = [];
let tagDataLength = 0;

let tagSuggestElement = null;
let keys = [];
let progress = 0;

let previousPos = null;
let previousIncluding = "";

async function downloadLists() {
	let downloaded = 0;
	downloadFile("https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/artist_list.txt", null, "text").then((data) => {
		artistList = data.split("\n");
		console.log("downloaded artist_list.txt");
		console.log(artistList.length);
		downloaded++;
	});

	downloadFile("https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/character_list.txt", null, "text").then((data) => {
		characterList = data.split("\n");
		console.log("downloaded character_list.txt");
		console.log(characterList.length);
		downloaded++;
	});

	downloadFile("https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/whitelist.txt", null, "text").then((data) => {
		whitelist = data.split("\n");
		for (let temp of whitelist) {
			whitelistSeparated.push(temp.split(" "));
		}
		console.log("downloaded whitelist.txt");
		console.log(whitelist.length);
		downloaded++;
	});

	downloadFile("https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/censor_list.txt", null, "text").then((data) => {
		censorList = data.split("\n");
		console.log("downloaded censor_list.txt");
		console.log(censorList.length);
		downloaded++;
	});

	downloadFile("https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/copyright_list.txt", null, "text").then((data) => {
		copyrightList = data.split("\n");
		console.log("downloaded copyright_list.txt");
		console.log(censorList.length);
		downloaded++;
	});

	downloadFile("https://huggingface.co/Jio7/NAI-Prompt-Randomizer/resolve/main/key.csv", null, "text").then((data) => {
		keys = data.split("\n");
		for (let i = 0; i < keys.length; i++) {
			keys[i] = keys[i].split("|");
			keys[i][1] = parseInt(keys[i][1]);
		}
		console.log("downloaded key.csv");
		console.log(keys.length);
		downloaded++;
	});

	tagDataLength = 2012411821;

	let interval = setInterval(() => {
		document.getElementById('generate').innerHTML = "Downloading Data... " + Math.round(downloaded / 6 * 100) + "%";

		if (downloaded == 6) {
			clearInterval(interval);
			console.log("downloaded all lists");
			document.getElementById('generate').innerHTML = "Generate";
			document.getElementById("generate").disabled = false;
		}
	}, 100);
}

// On page load
window.onload = async function () {
	downloadLists();
	await init();
	
	const options = localStorage.getItem('options');
	if(options == null) {
		loadOptions(example);
	}
	else {
		loadOptions(localStorage.getItem('options'));
	}
	css();
	checkDYN();

	document.getElementById('loading').style.display = 'none';
}

// Init css elements
function css() {
	const image = document.getElementById('image');

	// Move maid
	let maid = document.getElementById('maid');
	setInterval(() => {
		if(maid.style.visibility == 'visible') {
			let maidPos = Number(maid.style.right.substring(0, maid.style.right.length - 2));
			maidPos += 1;
			maid.style.right = maidPos + 'px';
	
			if(maidPos > image.clientWidth + 200) {
				maid.style.right = '-100px';
			}
		}
	}, 10);

	// Set minimum height for textareas
	const textareas = document.getElementsByTagName('textarea');
	Array.from(textareas).forEach((textarea) => {
		textarea.style.minHeight = textarea.rows * 25 + 24 + 'px';
	});

	// Sidebar event listener for auto saving parameter changes
	const sidebarItems = document.getElementById("items");
	sidebarItems.addEventListener('change', (e) => {
		const options = getOptions();
		const optionsStr = JSON.stringify(options, null, 4);
		checkDYN();
		localStorage.setItem('options', optionsStr);
	});
	
	// Init dropdown menus
	const dropdowns = document.getElementsByClassName('dropdown');
	Array.from(dropdowns).forEach((dropdown) => {
		const id = dropdown.id.substring(9);
		const option = document.getElementById("option_" + id);

		moveDropdown(dropdown, option);

		// When dropdown menu is clicked
		dropdown.addEventListener('click', (e) => {
			if (option.style.visibility == 'visible') {
				option.style.visibility = 'hidden';
			}
			else {
				option.style.visibility = 'visible';
				option.scrollTop = 0;
				Array.from(option.children).forEach((child) => {
					if(child.innerHTML === dropdown.children[0].innerHTML) {
						child.classList.add('selected');
					}
					else {
						child.classList.remove('selected');
					}

					if(id === 'imgsize') {
						const imgSize = findImageSize(widthElement.value, heightElement.value);
						const imgSizeStr = imgSize[1] + " " + imgSize[2];

						if(child.innerHTML === imgSizeStr) {
							child.classList.add('selected');
						}
					}
				});
			}

			e.stopPropagation();
		});

		// Move dropdown menu when scrolling
		sidebarItems.addEventListener('scroll', (e) => {
			moveDropdown(dropdown, option);
			moveTagSuggest();

			if (tagSuggestElement != null) {
				if (sidebarItems.getBoundingClientRect().top + window.pageYOffset > tagSuggestElement.getBoundingClientRect().bottom + window.pageYOffset) {
					hideTagSuggest();
				}
			}
		});

		window.addEventListener('resize', (e) => {
			// Move dropdown menu when resizing
			moveDropdown(dropdown, option);
			resizeInfo();
			moveTagSuggest();
		});

		// When dropdown menu options are clicked
		Array.from(option.children).forEach((child) => {
			if(!child.classList.contains('title')) {
				child.addEventListener('click', (e) => {
					const prv = dropdown.children[0].innerHTML;

					dropdown.children[0].innerHTML = child.innerHTML;
					option.style.visibility = 'hidden';

					// Image size dropdown menu
					if(id === 'imgsize') {
						if(child.innerHTML === 'Custom') {
							dropdown.children[0].innerHTML = prv;
						}
						else {
							changeImageSize(child.innerHTML);
							const imgSize = findImageSize(widthElement.value, heightElement.value);
							dropdown.children[0].innerHTML = imgSize[0] + " " + imgSize[1];
						}
					}

					// Preset dropdown menu -- Deprecated
					if(id === 'preset') {
						const example = '{"begprompt":"1girl, {{kirisame marisa}}, {{}}","including":"1girl, ~speech bubble, ~commentary, ~blood, ~gun, ~guro, ~bdsm, ~shibari, ~butt plug, ~object insertion, ~pregnant","removeArtist":true,"removeCharacter":true,"endprompt":"{{{volumetric lighting, depth of field, best quality, amazing quality, very aesthetic, highres, incredibly absurdres}}}","negativePrompt":"{{{{{worst quality, bad quality}}}}}}, {{{{bad hands}}}}, {{{bad eyes, bad pupils, bad glabella}}},{{{undetailed eyes}}}},{{abs,rib,abdominal,rib line,muscle definition,muscle separation,sharp body line}},{{wide hips,narrow waist}}, text, error, extra digit, fewer digits, jpeg artifacts, signature, watermark, username, reference, {{unfinished}},{{unclear fingertips}}, {{twist}}, {{Squiggly}}, {{Grumpy}} , {{incomplete}}, {{Imperfect Fingers}}, Disorganized colors ,Cheesy, {{very displeasing}}, {{mess}}, {{Approximate}}, {{Sloppiness}},{{{{{futanari, dickgirl}}}}}","width":"832","height":"1216","step":"28","promptGuidance":"5","promptGuidanceRescale":"0","seed":"","sampler":"Euler Ancestral","smea":true,"dyn":false,"delay":"8","automation":false,"autodownload":false}';

						if(child.id === 'ex') {
							loadOptions(example);
						}
						else if(child.id === 'add') {
							dropdown.children[0].innerHTML = prv;
							const name = window.prompt("Please enter the name of the preset.", "");
							if(name != null && name != "") {
								dropdown.children[0].innerHTML = name;
								
								let li = document.createElement('li');
								li.innerHTML = name;

								option.insertBefore(li, option.firstChild);
							}
						}
					}

					// Fire change event to trigger auto saving
					sidebarItems.dispatchEvent(new Event('change'));
				});
			}
		});

		// Prevent dropdown options from hiding when clicked
		option.addEventListener('click', (e) => {
			e.stopPropagation();
		});

		// Hide dropdown menus when clicked outside
		window.addEventListener('click', (e) => {
			option.style.visibility = 'hidden';
		});
	});

	// Init size input fields
	const widthElement = document.getElementById('width');
	const heightElement = document.getElementById('height');

	// Select all text when clicked
	widthElement.addEventListener('click', (e) => {
		widthElement.select();
	});
	heightElement.addEventListener('click', (e) => {
		heightElement.select();
	});

	// Only allow numbers
	widthElement.addEventListener('input', (e) => {
		widthElement.value = widthElement.value.replace(/\D/g, '');
		if(widthElement.value.length > 4) {
			widthElement.value = widthElement.value.substring(0, 4);
		}

		const imgSize = findImageSize(widthElement.value, heightElement.value);
		document.getElementById('dropdown_imgsize').children[0].innerHTML = imgSize[0] + " " + imgSize[1];
	});
	heightElement.addEventListener('input', (e) => {
		heightElement.value = heightElement.value.replace(/\D/g, '');
		if(heightElement.value.length > 4) {
			heightElement.value = heightElement.value.substring(0, 4);
		}

		const imgSize = findImageSize(widthElement.value, heightElement.value);
		document.getElementById('dropdown_imgsize').children[0].innerHTML = imgSize[0] + " " + imgSize[1];
	});

	// Round to nearest multiple of 64
	widthElement.addEventListener('blur', (e) => {
		if(widthElement.value < 64) {
			widthElement.value = 64;
		}
		else{
			widthElement.value = Math.round(widthElement.value / 64) * 64;
		}
	});
	heightElement.addEventListener('blur', (e) => {
		if(heightElement.value < 64) {
			heightElement.value = 64;
		}
		else{
			heightElement.value = Math.round(heightElement.value / 64) * 64;
		}
	});

	// Init input fields
	const seedElement = document.getElementById('seed');

	// Select all text when clicked
	seedElement.addEventListener('click', (e) => {
		seedElement.select();
	});

	// Only allow numbers
	seedElement.addEventListener('input', (e) => {
		seedElement.value = seedElement.value.replace(/\D/g, '');
		if(seedElement.value.length > 10) {
			seedElement.value = seedElement.value.substring(0, 10);
		}
	});


	// Init slider input fields
	const promptGuidanceElement = document.getElementById('pg');
	const promptGuidanceTitleElement = document.getElementById('pgt');

	const stepElement = document.getElementById('step');
	const stepTitleElement = document.getElementById('stept');

	const promptGuidanceRescaleElement = document.getElementById('pgr');
	const promptGuidanceRescaleTitleElement = document.getElementById('pgrt');

	const delayElement = document.getElementById('delay');
	const delayTitleElement = document.getElementById('delayt');

	// Show slider value on title when moved
	promptGuidanceElement.addEventListener('input', (e) => {
		promptGuidanceTitleElement.innerHTML = "Prompt Guidance: " + promptGuidanceElement.value;
	});
	promptGuidanceTitleElement.innerHTML = "Prompt Guidance: " + promptGuidanceElement.value;

	stepElement.addEventListener('input', (e) => {
		stepTitleElement.innerHTML = "Steps: " + stepElement.value;
	});
	stepTitleElement.innerHTML = "Steps: " + stepElement.value;

	promptGuidanceRescaleElement.addEventListener('input', (e) => {
		promptGuidanceRescaleTitleElement.innerHTML = "Prompt Guidance Rescale: " + promptGuidanceRescaleElement.value;
	});
	promptGuidanceRescaleTitleElement.innerHTML = "Prompt Guidance Rescale: " + promptGuidanceRescaleElement.value;

	delayElement.addEventListener('input', (e) => {
		delayTitleElement.innerHTML = "Delay: " + delayElement.value + " seconds";
	});
	delayTitleElement.innerHTML = "Delay: " + delayElement.value + " seconds";


	// Disable dragging for h2 elements
	Array.from(document.getElementsByTagName('h2')).forEach((h2) => {
		h2.setAttribute('draggable', 'false');
	});

	// Init image info
	const result = document.getElementById('result');
	const info = document.getElementById('info');

	result.addEventListener('mouseenter', (e) => {
		resizeInfo();
		info.classList.add('shown');
	});
	info.addEventListener('mouseenter', (e) => {
		resizeInfo();
		info.classList.add('shown');
	});

	result.addEventListener('mouseleave', (e) => {
		info.classList.remove('shown');
	});
	info.addEventListener('mouseleave', (e) => {
		info.classList.remove('shown');
	});

	document.getElementById('id').addEventListener('keyup', (e) => {
		if (e.key === 'Enter') {
			button.click();
		}
	});
	document.getElementById('password').addEventListener('keyup', (e) => {
		if (e.key === 'Enter') {
			button.click();
		}
	});

	// Init login button
	let button = document.getElementById('loginBtn');
	button.addEventListener('click', async (e) => {
		let id = document.getElementById('id');
		let pw = document.getElementById('password');

		// Disable fields and button
		id.disabled = true;
		pw.disabled = true;
		button.disabled = true;

		// Check if ID and password are empty
		if(id.value == "" || pw.value == "" || id.value == null || pw.value == null) {
			id.disabled = false;
			pw.disabled = false;
			button.disabled = false;

			document.getElementById('text').innerHTML = "Please enter your ID and password.";
			document.getElementById('text').classList.add('warning');
			document.getElementById('text').classList.add('shake');
			document.addEventListener('animationend', () => {
				document.getElementById('text').classList.remove('shake');
			});
			return;
		}

		// Login
		const res = await login(id.value, pw.value);
		if(!res) { // Failed to login
			id.disabled = false;
			pw.disabled = false;
			button.disabled = false;

			document.getElementById('text').innerHTML = "Failed to login: please check your ID and password.";
			document.getElementById('text').classList.add('warning');
			document.getElementById('text').classList.add('shake');
			document.addEventListener('animationend', () => {
				document.getElementById('text').classList.remove('shake');
			});
		}
		else { // Successfully logged in
			document.getElementById('login').style.display = 'none';
			document.getElementById('login').style.visibility = 'hidden';

			document.getElementById('sidebar').classList.remove('hidden');
		}
	});

	// Init tag autocomplete
	const begprompt = document.getElementById('begprompt');
	const including = document.getElementById('including');
	const endprompt = document.getElementById('endprompt');
	const negprompt = document.getElementById('negprompt');

	begprompt.addEventListener('input', (e) => {
		if(e.data == "{") {hideTagSuggest(); return;}
		if(e.data == "}") {hideTagSuggest(); return;}

		suggestTags(begprompt.value.substring(0, begprompt.selectionStart), begprompt);
	});
	begprompt.addEventListener('blur', (e) => {
		hideTagSuggest();
	});
	begprompt.addEventListener('click', (e) => {
		hideTagSuggest();
	});

	including.addEventListener('input', (e) => {
		suggestTags(including.value.substring(0, including.selectionStart), including);
	});
	including.addEventListener('blur', (e) => {
		hideTagSuggest();
	});
	including.addEventListener('click', (e) => {
		hideTagSuggest();
	});

	endprompt.addEventListener('input', (e) => {
		suggestTags(endprompt.value.substring(0, endprompt.selectionStart), endprompt);
	});
	endprompt.addEventListener('blur', (e) => {
		hideTagSuggest();
	});
	endprompt.addEventListener('click', (e) => {
		hideTagSuggest();
	});

	negprompt.addEventListener('input', (e) => {
		suggestTags(negprompt.value.substring(0, negprompt.selectionStart), negprompt);
	});
	negprompt.addEventListener('blur', (e) => {
		hideTagSuggest();
	});
	negprompt.addEventListener('click', (e) => {
		hideTagSuggest();
	});
}

/* load user options */
function loadOptions(options) {
	options = JSON.parse(options);

	document.getElementById('begprompt').value = options.begprompt;
	document.getElementById('including').value = options.including;
	document.getElementById('removeArtist').checked = options.removeArtist;
	document.getElementById('removeCharacter').checked = options.removeCharacter;
	document.getElementById('removeCopyright').checked = options.removeCopyright;
	document.getElementById('endprompt').value = options.endprompt;
	document.getElementById('negprompt').value = options.negativePrompt;

	document.getElementById('width').value = options.width;
	document.getElementById('height').value = options.height;
	document.getElementById('step').value = options.step;
	document.getElementById('pg').value = options.promptGuidance;
	document.getElementById('pgr').value = options.promptGuidanceRescale;
	document.getElementById('seed').value = options.seed;
	document.getElementById('dropdown_sampler').children[0].innerHTML = options.sampler;
	document.getElementById('SMEA').checked = options.smea;
	document.getElementById('DYN').checked = options.dyn;

	document.getElementById('delay').value = options.delay;
	document.getElementById('automation').checked = options.automation;
	document.getElementById('autodown').checked = options.autodownload;

	const imgSize = findImageSize(options.width, options.height);
	document.getElementById('dropdown_imgsize').children[0].innerHTML = imgSize[0] + " " + imgSize[1];
}

// Get user options
function getOptions() {
	var options = {};
	options.begprompt = document.getElementById('begprompt').value;
	options.including = document.getElementById('including').value;
	options.removeArtist = document.getElementById('removeArtist').checked;
	options.removeCharacter = document.getElementById('removeCharacter').checked;
	options.removeCopyright = document.getElementById('removeCopyright').checked;
	options.endprompt = document.getElementById('endprompt').value;
	options.negativePrompt = document.getElementById('negprompt').value;

	options.width = document.getElementById('width').value;
	options.height = document.getElementById('height').value;
	options.step = document.getElementById('step').value;
	options.promptGuidance = document.getElementById('pg').value;
	options.promptGuidanceRescale = document.getElementById('pgr').value;
	options.seed = document.getElementById('seed').value;
	options.sampler = document.getElementById('dropdown_sampler').children[0].innerHTML;
	options.smea = document.getElementById('SMEA').checked;
	options.dyn = document.getElementById('DYN').checked;

	options.delay = document.getElementById('delay').value;
	options.automation = document.getElementById('automation').checked;
	options.autodownload = document.getElementById('autodown').checked;

	return options;
}

function resizeInfo() {
	const result = document.getElementById('result');
	const info = document.getElementById('info');

	const rect = result.getBoundingClientRect();

	info.style.top = rect.bottom - info.getBoundingClientRect().height + window.pageYOffset + 'px';
	info.style.left = rect.left + window.pageXOffset + 'px';

	info.style.width = result.clientWidth - window.pageXOffset + 'px';
}

function initInfo(url) {
	getExif(url).then((data) => {
		document.getElementById('info').innerHTML = data.prompt;
	});

	document.getElementById('info').scrollTop = 0;
}

// Change image size field based on string
function changeImageSize(str) {
	const size = /\(([^)]+)\)/.exec(str)[1].split('x');
	document.getElementById('width').value = size[0];
	document.getElementById('height').value = size[1];
}

// Find image size based on width and height
function findImageSize(width, height) {
	const dict = {
		"832x1216": ["Normal", "Portrait", "(832x1216)"],
		"1216x832": ["Normal", "Landscape", "(1216x832)"],
		"1024x1024": ["Normal", "Square", "(1024x1024)"],

		"1024x1536": ["Large", "Portrait", "(1024x1536)"],
		"1536x1024": ["Large", "Landscape", "(1536x1024)"],
		"1472x1472": ["Large", "Square", "(1472x1472)"],

		"1088x1920": ["Wallpaper", "Portrait", "(1088x1920)"],
		"1920x1088": ["Wallpaper", "Landscape", "(1920x1088)"],

		"512x768": ["Small", "Portrait", "(512x768)"],
		"768x512": ["Small", "Landscape", "(768x512)"],
		"640x640": ["Small", "Square", "(640x640)"]
	};

	const key = width + "x" + height;
	if(key in dict) {
		return dict[key];
	}
	else {
		return ["Custom", "", ""];
	}
}

// Move dropdown menu
function moveDropdown(dropdown, option) {
	const rect = dropdown.getClientRects()[0];
	const optionRect = option.getClientRects()[0];

	let top = rect.top - optionRect.height;

	if (top < 0) {
		top = rect.top + rect.height;
	}

	option.style.top = top + 'px';
	option.style.left = rect.left + 'px';
}

function showHistory() {
	document.getElementById('history').classList.add('shown');
	const ele = document.getElementById('image');
	ele.style.transition = 'width 0.3s ease-in-out';
	ele.classList.add('shown');

	setTimeout(() => {
		ele.style.transition = 'none';
	}, 300);
}

function hideHistory() {
	document.getElementById('history').classList.remove('shown');
	const ele = document.getElementById('image');
	ele.style.transition = 'width 0.3s ease-in-out';
	ele.classList.remove('shown');

	setTimeout(() => {
		ele.style.transition = 'none';
	}, 300);
}

// init server connection
async function init() {
	// Auto login.
	let accessToken = localStorage.getItem("key");
	if (accessToken == null) {
		// Not logged in.
	}
	else {
		key = accessToken;
		try {
			await testAccessToken(accessToken);
			// Successfully auto logged in.
			console.log("Logged in");
			document.getElementById('login').style.display = 'none';
			document.getElementById('login').style.visibility = 'hidden';
			document.getElementById('background').style.display = 'none';

			document.getElementById('sidebar').classList.remove('hidden');
		} catch (err) {
			// Failed to auto login.
			console.log("Failed to login");
		}
	}
}

async function randomizePrompt() {
	options = getOptions();

	let begprompt = removeEmptyElements(strToList(options.begprompt));
	let including = removeEmptyElements(strToList(options.including));
	let excluding = [];
	for (var i = 0; i < including.length; i++) {
		if (including[i].startsWith("~")) {
			excluding.push(including[i].substring(1));
			including.splice(i, 1);
			i--;
		}
	}

	including = removeEmptyElements(including);
	excluding = removeEmptyElements(excluding);

	let removeArtist = options.removeArtist;
	let removeCharacter = options.removeCharacter;
	let removeCopyright = options.removeCopyright;

	let endprompt = removeEmptyElements(strToList(options.endprompt));
	let negative = removeEmptyElements(strToList(options.negativePrompt));

	let prompt = await getRandomPrompt(including, excluding, options.including);

	if(prompt == null || prompt === "") {
		return null;
	}

	prompt = strToList(prompt);
	prompt = removeEmptyElements(prompt);

	prompt = removeListFromList(negative, prompt);
	prompt = removeListFromList(begprompt, prompt);
	prompt = removeListFromList(endprompt, prompt);

	if (removeArtist) {
		prompt = removeListFromList(artistList, prompt);
	}

	if (removeCharacter) {
		prompt = removeListFromList(characterList, prompt);
	}

	if (removeCopyright) {
		prompt = removeListFromList(copyrightList, prompt);
	}

	if (begprompt.includes("uncensored") || endprompt.includes("uncensored")) {
		prompt = removeListFromList(censorList, prompt);
	}

	prompt = onlyInLists(prompt, whitelist, artistList, characterList);
	prompt = combinePrompt(begprompt, prompt, endprompt);

	return prompt;
}

async function getRandomPrompt(including, excluding, searchString) {
	process = 0;

	if (including.length == 0) {
		return null;
	}

	for (var i = 0; i < including.length; i++) {
		let index = keys.findIndex(function (element) {
			return element[0] == including[i];
		}, including[i]);

		if (index == -1) {
			return null;
		}
	}

	let pos;

	let inc = searchString;
	if (previousIncluding === inc) {
		pos = previousPos;
	}
	else {
		for (i = 0; i < including.length; i++) {
			if (i == 0) {
				pos = new Set(await getPositions(including[i]));
			}
			else {
				var temp = new Set(await getPositions(including[i]));
				pos = new Set([...pos].filter(x => temp.has(x)));
				delete temp;
			}
	
			process = i / (including.length + excluding.length);
			document.getElementById('generate').innerHTML = "Searching... " + Math.round(process * 100) + "%";
		}
		
		for (i = 0; i < excluding.length; i++) {
			temp = new Set(await getPositions(excluding[i]));
			pos = new Set([...pos].filter(x => !temp.has(x)));
			delete temp;
			
			process = (i + including.length) / (including.length + excluding.length);
			document.getElementById('generate').innerHTML = "Searching... " + Math.round(process * 100) + "%";
		}
	
		pos = Array.from(pos);
	}

	console.log(pos.length);

	previousIncluding = inc;
	previousPos = pos;

	pos = pos[Math.floor(Math.random() * pos.length)];

	document.getElementById('generate').innerHTML = "Generate";

	return await getPromptFromPos(pos);
}

async function getPromptFromPos(pos) {
	return await post('/readTags', { 'pos': pos }, null, 'text');
}

async function readTagData(start, end) {
	let data = await fetch("https://huggingface.co/Jio7/NAI-Prompt-Randomizer/resolve/main/tags.csv", { headers: { Range: `bytes=${start}-${end - 1}` } });
	data = await data.arrayBuffer();
	data = new Uint8Array(data);

	return data;
}

async function getPositions(tag) {
	let index = keys.findIndex(function (element) {
		return element[0] == tag;
	}, tag);

	if (index == -1) {
		return [];
	}

	let start = keys[index][1];
	let end = 0;

	if(index == keys.length - 1) {
		end = tagDataLength;
	}
	else {
		end = keys[index + 1][1];
	}

	let data = await fetch("https://huggingface.co/Jio7/NAI-Prompt-Randomizer/resolve/main/pos.csv", { headers: { Range: `bytes=${start*4}-${end*4 - 1}` } });
	data = await data.arrayBuffer();

	let pos = [];
	var view = new DataView(data, 0);

	for (let i = 0; i < data.byteLength / 4; i++) {
		pos.push(view.getUint32(i * 4));
	}

	return pos;
}

function combinePrompt(beg, mid, end) {
	let prompt = beg.concat(mid).concat(end).join(", ");

	prompt = beg.concat(mid).concat(end).join(", ");
	return prompt;
}

function onlyInLists(list1, list2, list3, list4) {
	let list = [];

	for (var i = 0; i < list1.length; i++) {
		if (list2.includes(list1[i])) {
			list.push(list1[i]);
		}
		else if (list3.includes(list1[i])) {
			list.push(list1[i]);
		}
		else if (list4.includes(list1[i])) {
			list.push(list1[i]);
		}
	}

	return list;
}

function allInList(list1, list2) {
	for (var i = 0; i < list1.length; i++) {
		let found = false;
		for (var j = 0; j < list2.length; j++) {
			if ((list2[j].substring(0, list1[i].length) === list1[i])) {
				found = true;
				break;
			}
		}

		if (!found) {
			return false;
		}
	}

	return true;
}

function removeEmptyElements(list) {
	for (var i = 0; i < list.length; i++) {
		if (list[i].trim() == "") {
			list.splice(i, 1);
			i--;
		}
	}

	return list;
}

function strToList(str) {
	str = str.trim();
	if(str == "") return [];

	let list = str.split(",");
	for (let i = 0; i < list.length; i++) {
		list[i] = list[i].trim();
	}

	return list;
}

function removeListFromList(list1, list2) {
	for (var i = 0; i < list1.length; i++) {
		while(list2.includes(list1[i].replace(/{/g, "").replace(/}/g, ""))) {
			list2.splice(list2.indexOf(list1[i].replace(/{/g, "").replace(/}/g, "")), 1);
		}
	}

	return list2;
}

// Generate button click
async function generate() {
	document.getElementById('generate').disabled = true;
	document.getElementById('generate').innerHTML = "Searching... 0%";

	let options = getOptions();
	
	let prompt = await randomizePrompt();
	if(prompt == null) {
		alert("Failed to get prompt");
		document.getElementById('maid').style.visibility = 'hidden';
		document.getElementById('generate').disabled = false;
		document.getElementById('image').classList.remove('generating');
		return;
	}

	document.getElementById('maid').style.visibility = 'visible';
	document.getElementById('maid').style.right = '-100px';
	document.getElementById('image').classList.add('generating');

	let negativePrompt = options.negativePrompt;

	let width = Number(options.width);
	let height = Number(options.height);
	
	let promptGuidance = Number(options.promptGuidance);
	let promptGuidanceRescale = Number(options.promptGuidanceRescale);

	let sampler;

	switch (options.sampler) {
		case "Euler":
			sampler = "k_euler";
			break;
		case "Euler Ancestral":
			sampler = "k_euler_ancestral";
			break;
		case "DPM++ 2S Ancestral":
			sampler = "k_dpmpp_2s_ancestral";
			break;
		case "DPM++ SDE":
			sampler = "k_dpmpp_sde";
			break;
	}

	let SMEA = options.smea;
	let DYN = options.dyn;

	let seed = 0;

	if (options.seed === "") {
		seed = Math.floor(Math.random() * 9999999999);
	}
	else {
		seed = Number(options.seed);
	}

	let noiseSeed = Math.floor(Math.random() * 9999999999);

	let params = {
		"legacy": false,
		"legacy_v3_extend": false,
		"quality_toggle": false,
		"width": width,
		"height": height,
		"n_samples": 1,
		"seed": seed,
		"extra_noise_seed": noiseSeed,
		"sampler": sampler,
		"steps": 28,
		"scale": promptGuidance,
		"uncond_scale": 1.0,
		"negative_prompt": negativePrompt,
		"sm" : SMEA,
		"sm_dyn" : DYN,
		"dynamic_thresholding": false,
		"controlnet_strength": 1,
		"add_original_image": true,
		"cfg_rescale": promptGuidanceRescale,
		"noise_schedule": "native",
		"ucPreset": 3,
		"params_version": 1
	};
	let result = null;

	try {
		result = await generateImage(key, prompt, "nai-diffusion-3", "generate", params);
	} catch {
		console.log("Failed to generate image");
		alert("NovelAI server error: please try again later.");
		
		document.getElementById('maid').style.visibility = 'hidden';
		document.getElementById('image').classList.remove('generating');
		document.getElementById('generate').disabled = false;
		document.getElementById('generate').innerHTML = "Generate";

		return;
	}

	document.getElementById('result').src = result;
	initInfo(result);

	if (options.autodownload) {
		download(result, prompt.substring(0, 80) + "_" + seed + ".png");
	}

	document.getElementById('maid').style.visibility = 'hidden';
	document.getElementById('image').classList.remove('generating');

	// Add to history
	let ele = document.createElement('img');
	ele.src = result;
	ele.addEventListener('click', (e) => {
		document.getElementById('result').src = ele.src;
		initInfo(ele.src);
		
		const child = document.getElementById('historyItem').children;
		Array.from(child).forEach((child) => {
			child.classList.remove('selected');
		});

		ele.classList.add('selected');
	});

	const child = document.getElementById('historyItem').children;
	Array.from(child).forEach((child) => {
		child.classList.remove('selected');
	});
	ele.classList.add('selected');

	const history = document.getElementById('historyItem');
	history.insertBefore(ele, history.firstChild);

	if (options.automation) {
		let time = 0;

		const interval = setInterval(() => {
			options = getOptions();
			time += 100;
			document.getElementById('generate').innerHTML = time / 1000 + "s / " + options.delay + "s";
			
			if (!options.automation) {
				document.getElementById('generate').disabled = false;
				document.getElementById('generate').innerHTML = "Generate";
				clearInterval(interval);
			}

			if (time >= options.delay * 1000) {
				generate();
				document.getElementById('generate').innerHTML = "Generate";
				clearInterval(interval);
			}
		}, 100);
	}
	else {
		document.getElementById('generate').disabled = false;
	}
 
	return result;
}

function download(dataurl, filename) {
	const link = document.createElement("a");
	link.href = dataurl;
	link.download = filename;
	link.click();
}

function searchTags(str) {
	let list = [];
	for(let i = 0; i < whitelist.length; i++) {
		if (whitelist[i].includes(str)) {
			list.push(whitelist[i]);
		}

		if (list.length >= 5) {
			break;
		}
	}

	return list;
}
	
function expand() {
	document.getElementById('sidebar').classList.toggle('expanded');
	document.getElementById('upico').classList.toggle('rotate');
}

function hideTagSuggest() {
	document.getElementById('tagSuggest').style.visibility = 'hidden';
}

function suggestTags(str, element) {
	tagSuggestElement = element;
	const tags = findTags(str);

	if(tags.length == 0) {
		hideTagSuggest();
		return;
	}

	const suggest = document.getElementById('tagSuggest');
	suggest.innerHTML = "";

	suggest.addEventListener('mousedown', (e) => {
		e.stopPropagation();
		e.preventDefault();
	});

	for(let i = 0; i < tags.length; i++) {
		const item = document.createElement('div');
		item.classList.add('item');
		item.innerHTML = tags[i];

		item.addEventListener('mouseup', (e) => {
			const tag = tags[i];
			const str = tagSuggestElement.value;
			const cursorStr = str.substring(0, tagSuggestElement.selectionStart);
			let start = 0;
			let end = tagSuggestElement.selectionStart;

			start = Math.max(cursorStr.lastIndexOf(",") + 1, cursorStr.lastIndexOf(", ") + 2, cursorStr.lastIndexOf("{") + 1, cursorStr.lastIndexOf("~") + 1);

			tagSuggestElement.value = str.substring(0, start) + tag + str.substring(end);
			tagSuggestElement.selectionStart = start + tag.length;
			tagSuggestElement.selectionEnd = start + tag.length;

			hideTagSuggest();

			e.preventDefault();
		});

		suggest.appendChild(item);
	}

	moveTagSuggest();

	suggest.style.visibility = 'visible';
}

function moveTagSuggest() {
	if (tagSuggestElement != null) {
		const suggest = document.getElementById('tagSuggest');
		const rect = tagSuggestElement.getBoundingClientRect();

		suggest.style.top = rect.bottom - 2 + window.pageYOffset + 'px';
		suggest.style.left = rect.left + window.pageXOffset + 'px';
	}
}

function findTags(str) {
	str = str.substring(str.lastIndexOf(",") + 1);
	str = str.toLowerCase().trim().replace(/_/g, " ").replace(/{/g, "").replace(/}/g, "").replace(/~/g, "");

	if(str == "") return [];
	
	tags = [];
	strSeparated = removeEmptyElements(str.split(" "));

	for (let i = 0; i < whitelistSeparated.length; i++) {
		if (allInList(strSeparated, whitelistSeparated[i])) {
			tags.push(whitelist[i]);
		}


		if(tags.length >= 5) {
			return tags;
		}
	}

	return tags;
}

function checkDYN() {
	const SMEA = document.getElementById('SMEA');
	const DYN = document.getElementById('DYN');

	if(SMEA.checked) {
		DYN.disabled = false;
	}
	else {
		DYN.disabled = true;
	}
}

// Generate image
async function generateImage(accessToken, prompt, model, action, parameters) {
	let data = {
		"input": prompt,
		"model": model,
		"action": action,
		"parameters": parameters,
	}

	let result = await post('generate-image', data, accessToken, 'blob');

	const { entries } = await unzipit.unzip(result);

	let blob = null;
	const imgName = Object.keys(entries)[0];
	await entries[imgName].blob('image/png').then((data) => { blob = data });

	return window.URL.createObjectURL(blob);
}

async function getExif(url) {
	const arrayBuffer = await $.ajax({
		url: url,
		type: 'GET',
		xhrFields: {
			responseType: 'arraybuffer'
		}
	});
	
	let data = new Uint8Array(arrayBuffer);

	let string = new TextDecoder("utf-8").decode(data);
	let pos = string.search('tEXtComment');

	string = string.substring(pos + 13);
	pos = string.search('"request_type"');
	string = string.substring(0, pos - 2);

	string = "{" + string + "}";

	return JSON.parse(string);
}

// Login to server
async function login(id, pw) {
	key = await connect(id, pw);

	if (key == null) {
		// Failed to login.
		console.log("Failed to login");
		return false;
	}
	else {
		// Successfully logged in.
		localStorage.setItem("key", key);
		console.log("Logged in");
		document.getElementById('background').style.display = 'none';
		return true;
	}
}

// Directly connect to server
async function connect(id, pw) {
	try {
		let accessToken = await getAccessToken(id, pw);
		let result = await testAccessToken(accessToken);
		return accessToken;
	} catch (err) {
		return null;
	}
}

// Test access token validity
async function testAccessToken(accessToken) {
	let url = api + "/user/information";
	let result = await get(url, accessToken);
	return result;
}

// Reformat access token
function reformatAccessToken(accessToken) {
	return "Bearer " + accessToken;
}

// Get access token
async function getAccessToken(id, pw) {
	let key = await getAccessKey(id, pw);
	let url = api + "/user/login";
	var accessToken = await post(url, {"key": key}).then((data) => { return data.accessToken; });
	return reformatAccessToken(accessToken);
}

// Get access key
async function getAccessKey(id, pw) {
	let key = await argon_hash(id, pw, 64, "novelai_data_access_key");
	return key.substring(0, 64);
}

// Hash for login information
async function argon_hash(email, password, size, domain) {
	var pre_salt = password.slice(0, 6) + email + domain;
	var salt = blake2b.blake2b(pre_salt, null, 16);

	var raw = await argon2.hash({
		pass: password,
		salt: salt,
		time: 2,
		mem: Math.floor(2000000 / 1024),
		hashLen: size,
		type: 2
	});

	var b64 = Buffer.Buffer.from(raw.hash).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

	return b64;
}

// Post request
async function post(url, data, authorization = null, resultType = 'json') {
	return new Promise((resolve, reject) => {
		fetch(url, {
			method: 'POST',
			headers: {
				'Authorization': authorization,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data)
		})
		.then((response) => {
			if(resultType == 'json') {
				resolve(response.json());
			}
			else if (resultType == 'blob') {
				resolve(response.blob());
			}
			else {
				resolve(response.text());
			}
		})
		.catch((err) => {
			reject(err);
		});
	});
}

// Get request
async function get(url, authorization = null) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: url,
			type: 'GET',
			beforeSend: function(request) {
				request.setRequestHeader("Authorization", authorization);
			},
			success: function(data) {
				resolve(data);
			},
			error: function(err) {
				reject(err);
			}
		});
	});
}

// Download file
async function downloadFile(url) {
	return new Promise((resolve, reject) => {
		fetch(url, {
			method: 'GET'
		})
		.then((response) => {
			resolve(response.text());
		})
		.catch((err) => {
			reject(err);
		});
	});
}