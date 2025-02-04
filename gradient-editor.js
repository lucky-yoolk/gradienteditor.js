/*
 * GradientEditor v1.0.0
 * https://github.com/lucky-yoolk/gradienteditor.js
 * Licensed under the MIT license
 */

class GradientEditor {
	static initializedEditors = new WeakMap();

	constructor(inputSelector, options = {}) {
		this.input = document.querySelector(inputSelector);

		if (!this.input) {
			console.error(`Invalid input selector: ${inputSelector}`);
			return;
		}

		if (GradientEditor.initializedEditors.has(this.input)) {
			console.warn(`GradientEditor already initialized for:`, this.input);
			return;
		}

		GradientEditor.initializedEditors.set(this.input, true);

		this.options = {
			defaultDirection: "to right",
			defaultColorStops: [
				{ color: "rgba(255, 0, 0, 1)", position: 0 },
				{ color: "rgba(0, 0, 255, 1)", position: 100 },
			],
			defaultValue: null,
			showInput: false,
			showDirectionToggle: true,
			showDirectionDegrees: true,
			showTemplates: true,
			previewContainer: null,
			...options,
		};

		// Handle multiple preview targets
		if (Array.isArray(this.options.previewContainer)) {
			this.previewElements = this.options.previewContainer
				.map(selector => document.querySelector(selector))
				.filter(el => el !== null);
		} else if (typeof this.options.previewContainer === "string") {
			const previewEl = document.querySelector(this.options.previewContainer);
			this.previewElements = previewEl ? [previewEl] : [];
		} else {
			this.previewElements = [];
		}

		this.colorStops = [];
		this.init();
	}

	initGradient() {
		const inputGradientValue = this.input.value && this.input.value.trim();
		this.gradient =
			this.convertHexToRgba(inputGradientValue) ||
			this.convertHexToRgba(this.options.defaultValue) ||
			`linear-gradient(${this.options.defaultDirection}, ${this.options.defaultColorStops
				.map(({ color, position }) => `${this.ensureRgba(color)} ${position}%`)
				.join(", ")})`;
	}

	parseGradientString(gradient) {
		const gradientRegex = /linear-gradient\(([^,]+),\s*(.+)\)/;
		const match = gradient.match(gradientRegex);
		if (!match) return null;

		const [, direction, stops] = match;
		this.options.defaultDirection = direction.trim();

		const stopRegex = /(rgba?\([^)]*\)|#[0-9a-fA-F]{3,6})(?:\s*(\d+)%?)?/g;
		let stopMatch;
		let parsedStops = [];

		while ((stopMatch = stopRegex.exec(stops))) {
			let [, color, position] = stopMatch;
			parsedStops.push({
				color: this.ensureRgba(color),
				position: position ? parseFloat(position) : null,
			});
		}

		if (parsedStops.length > 1) {
			parsedStops = this.normalizeStops(parsedStops);
		}

		return parsedStops;
	}

	normalizeStops(stops) {
		let totalStops = stops.length;
		let step = 100 / (totalStops - 1);

		return stops.map((stop, index) => {
			if (stop.position === null) {
				stop.position = index * step;
			}
			return stop;
		});
	}

	init() {
		this.createUI();
		if (!this.slider) {
			console.error("UI creation failed. Skipping initialization.");
			return;
		}
		this.applyDefaultGradient();
		this.attachEventListeners();
		this.attachDirectionControlEvents();
		this.initializeDirectionDot();
		this.updatePreview();
	}

	createUI() {
		let existingEditor = this.input.closest(".gradient-editor");
		if (existingEditor) {
			console.warn(
				"Gradient editor UI already exists. Removing and recreating for:",
				this.input
			);
			existingEditor.remove();
		}
	
		// Ensure `this.gradient` is initialized
		if (!this.gradient) {
			console.warn("Gradient is not set, initializing default.");
			this.initGradient(); // Ensure a valid gradient is set
		}
	
		// Create the main container for the gradient editor
		const container = document.createElement("div");
		container.classList.add("gradient-editor");
	
		// Create a wrapper for the input
		const inputWrapper = document.createElement("div");
		inputWrapper.classList.add("gradient-input-wrapper");
	
		// Append the input to the wrapper
		this.input.parentElement.insertBefore(container, this.input);
		this.input.parentElement.removeChild(this.input);
		inputWrapper.appendChild(this.input);
		container.appendChild(inputWrapper);
	
		// Check the showInput option to manage visibility and attributes
		if (!this.options.showInput) {
			inputWrapper.classList.add("oto-hidden");
		} else {
			this.input.addEventListener("input", (e) => {
				this.gradient = e.target.value;
				this.applyManualGradientUpdate();
			});
		}
	
		// Create the slider with a tooltip
		const sliderWrapper = document.createElement("div");
		sliderWrapper.classList.add("gradient-slider-wrapper");
	
		const slider = document.createElement("div");
		slider.classList.add("gradient-slider");
	
		sliderWrapper.appendChild(slider);
		this.slider = slider;
	
		// Tooltip for the slider
		const tooltip = document.createElement("div");
		tooltip.classList.add("gradient-tooltip");
		tooltip.textContent = "Click to add a color stop";
		sliderWrapper.appendChild(tooltip);
	
		slider.addEventListener("mouseenter", () => {
			tooltip.style.visibility = "visible";
		});
	
		slider.addEventListener("mouseleave", () => {
			tooltip.style.visibility = "hidden";
		});
	
		// Add slider wrapper to the container
		container.appendChild(sliderWrapper);
	
		// Wrapper for color-pickers-container and gradient utilities
		const controlsContainer = document.createElement("div");
		controlsContainer.classList.add("controls-container");
	
		// Add a container for color pickers
		const colorPickersContainer = document.createElement("div");
		colorPickersContainer.classList.add("color-pickers-container");
		controlsContainer.appendChild(colorPickersContainer);
	
		this.colorPickersContainer = colorPickersContainer;
	
		// Create a wrapper for direction controls and gradient picker
		const gradientUtils = document.createElement("div");
		gradientUtils.classList.add("gradient-utils");
	
		// Add toggle direction button with wrapper
		const toggleWrapper = document.createElement("div");
		toggleWrapper.classList.add("toggle-direction-wrapper");
	
		const toggleButton = document.createElement("button");
		toggleButton.classList.add("toggle-direction-button");
		toggleWrapper.appendChild(toggleButton);
	
		// Create the draggable direction control (circular dial)
		const directionControlWrapper = document.createElement("div");
		directionControlWrapper.classList.add("direction-control-wrapper");
	
		const directionDot = document.createElement("div");
		directionDot.classList.add("direction-dot");
	
		directionControlWrapper.appendChild(directionDot);
	
		this.directionDot = directionDot;
		this.directionControlWrapper = directionControlWrapper;
	
		// Create Gradient Picker Button
		const gradientPickerButton = document.createElement("button");
		gradientPickerButton.classList.add("gradient-picker-button");
	
		// Hide per options
		if (!this.options.showDirectionDegrees) {
			directionControlWrapper.classList.add("oto-hidden");
		}
		if (!this.options.showDirectionToggle) {
			toggleWrapper.classList.add("oto-hidden");
		}
		if (!this.options.showTemplates) {
			gradientPickerButton.classList.add("oto-hidden");
		}
	
		// Append elements to the gradient utils wrapper
		gradientUtils.appendChild(directionControlWrapper);
		gradientUtils.appendChild(toggleWrapper);
		gradientUtils.appendChild(gradientPickerButton);
	
		if (
			!this.options.showDirectionDegrees &&
			!this.options.showDirectionToggle &&
			!this.options.showTemplates
		) {
			gradientUtils.classList.add("oto-hidden");
		}
	
		// Append gradient utils wrapper to controls container
		controlsContainer.appendChild(gradientUtils);
	
		// Event Listener for Opening the Popup
		gradientPickerButton.addEventListener("click", () => this.openGradientPickerPopup());
	
		// Array of directions to toggle
		const directions = [
			"to top",
			"to bottom",
			"to left",
			"to right",
			"to top left",
			"to top right",
			"to bottom left",
			"to bottom right",
		];
	
		// Ensure `this.gradient` is set before using regex
		if (!this.gradient) {
			console.warn("Gradient is missing, using default.");
			this.initGradient(); // Ensure a valid gradient is set
		}
	
		const gradientRegex = /linear-gradient\(([^,]+),/;
		const match = this.gradient?.match(gradientRegex); // Ensure gradient exists before matching
	
		let currentDirectionIndex = directions.indexOf(this.options.defaultDirection);
		if (match) {
			const directionFromGradient = match[1].trim();
			currentDirectionIndex = directions.indexOf(directionFromGradient);
			if (currentDirectionIndex === -1) {
				currentDirectionIndex = directions.indexOf(this.options.defaultDirection);
			}
		}
	
		// Helper function to slugify the direction string
		const slugifyDirection = (direction) => {
			return `direction-${direction.replace(/\s+/g, "-").toLowerCase()}`;
		};
	
		// Update the toggleButton wrapper's background and class based on direction
		const updateToggleWrapperStyle = () => {
			const currentDirection = directions[currentDirectionIndex];
	
			// Generate a valid class for the current direction
			const newDirectionClass = slugifyDirection(currentDirection);
	
			// Remove any existing direction-* classes
			toggleWrapper.className = toggleWrapper.className
				.split(" ")
				.filter((className) => !className.startsWith("direction-"))
				.join(" ");
	
			// Add the new direction class
			toggleWrapper.classList.add(newDirectionClass);
	
			// Update direction dot position
			this.updateDirectionDotPosition(currentDirection);
		};
	
		// Initial update for the toggle wrapper
		updateToggleWrapperStyle();
	
		// Event listener for cycling through directions
		toggleButton.addEventListener("click", () => {
			currentDirectionIndex = (currentDirectionIndex + 1) % directions.length;
			const newDirection = directions[currentDirectionIndex];
			this.updateGradientDirection(newDirection);
			updateToggleWrapperStyle();
		});
	
		// Append the controlsContainer to the main container
		container.appendChild(controlsContainer);
	
		console.log("UI created for:", this.input);
	}



	applyDefaultGradient() {
		this.colorStops = this.parseGradientString(this.gradient) || this.options.defaultColorStops;
		this.updateGradientForSlider();
		this.renderColorStops();
		this.updatePreview();
	}

	ensureRgba(color) {
		if (color.startsWith("#")) {
			return this.hexToRgba(color);
		}
		return color;
	}

	convertHexToRgba(gradientString) {
		if (!gradientString) return null;
		return gradientString.replace(/#([0-9a-fA-F]{3,6})/g, (match) => this.hexToRgba(match));
	}

	hexToRgba(hex) {
		let r, g, b;
		if (hex.length === 4) {
			r = parseInt(hex[1] + hex[1], 16);
			g = parseInt(hex[2] + hex[2], 16);
			b = parseInt(hex[3] + hex[3], 16);
		} else {
			r = parseInt(hex.slice(1, 3), 16);
			g = parseInt(hex.slice(3, 5), 16);
			b = parseInt(hex.slice(5, 7), 16);
		}
		return `rgba(${r}, ${g}, ${b}, 1)`;
	}

	attachEventListeners() {
		this.input.addEventListener("input", (e) => {
			this.gradient = e.target.value;
			this.updatePreview();
		});

		this.slider.addEventListener("click", (e) => {
			const rect = this.slider.getBoundingClientRect();
			const position = ((e.clientX - rect.left) / rect.width) * 100;
			this.addColorStop("rgba(255, 255, 255, 1)", position);
		});
	}

	updateGradientDirection(direction) {
		this.options.defaultDirection = direction;
		this.gradient = this.createGradientString();
		this.updateGradientForSlider();
		this.updatePreview();
	}

	updateGradientForSlider() {
		const colors = this.colorStops
			.map(({ color, position }) => `${color} ${position.toFixed(1)}%`)
			.join(", ");

		const sliderWrapper = this.slider.parentElement;
		if (sliderWrapper && sliderWrapper.classList.contains("gradient-slider-wrapper")) {
			sliderWrapper.style.background = `linear-gradient(to right, ${colors})`;
		}
	}

	updatePreview() {
		if (this.previewElements.length > 0) {
			this.previewElements.forEach(element => {
				element.style.background = this.gradient;
			});
		}
		this.input.value = this.gradient;
	}

	createGradientString() {
		return `linear-gradient(${this.options.defaultDirection}, ${this.colorStops
			.map(({ color, position }) => `${color} ${position.toFixed(1)}%`)
			.join(", ")})`;
	}

	addColorStop(color, position) {
		this.colorStops.push({ color, position });
		this.colorStops.sort((a, b) => a.position - b.position);
		this.renderColorStops();
		this.updateGradientDirection(this.options.defaultDirection);
	}

	renderColorStops() {
		this.slider.innerHTML = "";
		this.colorPickersContainer.innerHTML = "";
	
		const showDeleteButtons = this.colorStops.length > 2;
	
		this.colorStops.forEach(({ color, position }, index) => {
			const stop = document.createElement("div");
			stop.classList.add("color-stop");
			stop.style.left = `${position}%`;
			stop.style.backgroundColor = color;
	
			// Dragging logic for color stops
			stop.addEventListener("mousedown", (e) => {
				e.preventDefault();
				const onMouseMove = (event) => {
					const rect = this.slider.getBoundingClientRect();
					let newPosition = ((event.clientX - rect.left) / rect.width) * 100;
					newPosition = Math.min(100, Math.max(0, newPosition));
					stop.style.left = `${newPosition}%`;
					this.colorStops[index].position = newPosition;
					this.colorStops.sort((a, b) => a.position - b.position);
					this.renderColorStops();
					this.updateGradientDirection(this.options.defaultDirection);
					this.updatePreview();
				};
	
				const onMouseUp = () => {
					document.removeEventListener("mousemove", onMouseMove);
					document.removeEventListener("mouseup", onMouseUp);
				};
	
				document.addEventListener("mousemove", onMouseMove);
				document.addEventListener("mouseup", onMouseUp);
			});
	
			this.slider.appendChild(stop);
	
			// Create UI for color picker and alpha slider
			const colorPickerWrapper = document.createElement("div");
			colorPickerWrapper.classList.add("color-picker-wrapper");
	
			const colorPicker = document.createElement("input");
			colorPicker.type = "color";
			colorPicker.value = this.rgbaToHex(color);
			colorPickerWrapper.appendChild(colorPicker);
	
			const alphaSlider = document.createElement("input");
			alphaSlider.type = "range";
			alphaSlider.min = 0;
			alphaSlider.max = 1;
			alphaSlider.step = 0.01;
			alphaSlider.value = this.parseRgba(color)[3]; // Extract alpha value
			colorPickerWrapper.appendChild(alphaSlider);
	
			const deleteButton = document.createElement("button");
			deleteButton.classList.add("color-picker-remove");
			deleteButton.style.display = showDeleteButtons ? "inline-block" : "none";
			deleteButton.addEventListener("click", () => {
				this.removeColorStop(index);
			});
			colorPickerWrapper.appendChild(deleteButton);
	
			this.colorPickersContainer.appendChild(colorPickerWrapper);
	
			// Event: Color Picker
			colorPicker.addEventListener("input", (e) => {
				const [r, g, b, a] = this.parseRgba(this.colorStops[index].color); // Preserve alpha value
				const newColor = `rgba(${parseInt(e.target.value.slice(1, 3), 16)}, ${parseInt(
					e.target.value.slice(3, 5),
					16
				)}, ${parseInt(e.target.value.slice(5, 7), 16)}, ${a})`;
				this.colorStops[index].color = newColor;
				stop.style.backgroundColor = newColor;
				this.updateGradientDirection(this.options.defaultDirection);
				this.updatePreview();
			});
	
			// Event: Alpha Slider
			alphaSlider.addEventListener("input", (e) => {
				const [r, g, b] = this.parseRgba(this.colorStops[index].color); // Extract RGB values
				const newAlpha = parseFloat(e.target.value); // Get new alpha value
				const newColor = `rgba(${r}, ${g}, ${b}, ${newAlpha})`; // Reconstruct RGBA color
				this.colorStops[index].color = newColor;
				stop.style.backgroundColor = newColor;
				this.updateGradientDirection(this.options.defaultDirection);
				this.updatePreview();
			});
		});
	}

	removeColorStop(index) {
		if (this.colorStops.length > 1) {
			this.colorStops.splice(index, 1);
		}
		this.renderColorStops();
		this.updateGradientDirection(this.options.defaultDirection);
		this.updatePreview();
	}

	rgbaToHex(rgba) {
		const [r, g, b] = this.parseRgba(rgba);
		return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
	}

	parseRgba(rgba) {
		const match = rgba.match(/\d+(\.\d+)?/g).map(Number);
		return [match[0], match[1], match[2], match[3] || 1];
	}
	
	attachDirectionControlEvents() {
		const moveDot = (e) => {
			const rect = this.directionControlWrapper.getBoundingClientRect();
			const centerX = rect.width / 2;
			const centerY = rect.height / 2;
			const dotRadius = this.directionDot.offsetWidth / 2; // Half the width of the dot
	
			const mouseX = e.clientX - rect.left - centerX;
			const mouseY = e.clientY - rect.top - centerY;
	
			let angle = Math.atan2(mouseY, mouseX); // Get angle in radians
	
			// Convert mathematical angle to CSS gradient angle:
			let degrees = (angle * (180 / Math.PI) + 90) % 360; 
			if (degrees < 0) degrees += 360; // Ensure it's always positive
	
			// Convert degrees into CSS-friendly "to direction"
			let direction = "";
			if (degrees === 0) direction = "to top";
			else if (degrees === 90) direction = "to right";
			else if (degrees === 180) direction = "to bottom";
			else if (degrees === 270) direction = "to left";
			else direction = `${degrees.toFixed(1)}deg`;
	
			this.updateGradientDirection(direction); // Apply the new direction
	
			// Calculate dot position based on angle
			const radius = centerX - dotRadius; // Subtract the dot radius to keep it within the circle
			const x = centerX + Math.cos((degrees - 90) * (Math.PI / 180)) * radius - dotRadius;
			const y = centerY + Math.sin((degrees - 90) * (Math.PI / 180)) * radius - dotRadius;
	
			this.directionDot.style.left = `${x}px`;
			this.directionDot.style.top = `${y}px`;
		};
	
		this.directionDot.addEventListener("mousedown", () => {
			const onMouseMove = (e) => moveDot(e);
			const onMouseUp = () => {
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", onMouseUp);
			};
			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
		});
	}
	
	initializeDirectionDot() {
		const rect = this.directionControlWrapper.getBoundingClientRect();
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;
		const dotRadius = this.directionDot.offsetWidth / 2; // Half the width of the dot
	
		let angle = 0;
		const direction = this.options.defaultDirection;
	
		if (direction.includes("deg")) {
			angle = ((360 - parseFloat(direction.replace("deg", ""))) * Math.PI) / 180; // Reverse rotation to match CSS
		} else {
			switch (direction) {
				case "to right": angle = Math.PI / 2; break;   // 90° in radians
				case "to bottom": angle = Math.PI; break;      // 180° in radians
				case "to left": angle = (3 * Math.PI) / 2; break; // 270° in radians
				case "to top": angle = 0; break;               // 0° in radians (CSS Top)
			}
		}
	
		const radius = centerX - dotRadius; // Subtract the dot radius to keep it within the circle
		const x = centerX + Math.sin(angle) * radius - dotRadius;
		const y = centerY - Math.cos(angle) * radius - dotRadius; // Invert Y-axis for DOM positioning
	
		this.directionDot.style.left = `${x}px`;
		this.directionDot.style.top = `${y}px`;
	}
	
	updateDirectionDotPosition(direction) {
		const rect = this.directionControlWrapper.getBoundingClientRect();
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;
		const dotRadius = this.directionDot.offsetWidth / 2; // Half the width of the dot
	
		let angle = 0;
	
		if (direction.includes("deg")) {
			angle = (parseFloat(direction.replace("deg", "")) * Math.PI) / 180; // Convert degrees to radians
		} else {
			switch (direction) {
				case "to right": angle = 0; break;
				case "to bottom": angle = Math.PI / 2; break;
				case "to left": angle = Math.PI; break;
				case "to top": angle = -Math.PI / 2; break;
				case "to top right": angle = -Math.PI / 4; break;
				case "to top left": angle = -3 * Math.PI / 4; break;
				case "to bottom right": angle = Math.PI / 4; break;
				case "to bottom left": angle = 3 * Math.PI / 4; break;
			}
		}
	
		const radius = centerX - dotRadius; // Subtract dot radius to keep it within the circle
		const x = centerX + Math.cos(angle) * radius - dotRadius;
		const y = centerY - Math.sin(angle) * radius - dotRadius; // Invert Y-axis for DOM positioning
	
		this.directionDot.style.left = `${x}px`;
		this.directionDot.style.top = `${y}px`;
	}
	
	openGradientPickerPopup() {
		const existingPopup = document.querySelector(".gradient-picker-popup");
		if (existingPopup) existingPopup.remove(); // Ensure only one popup exists
	
		const gradients=[{name:"Omolon",colors:["#091E3A","#2F80ED","#2D9EE0"]},{name:"Farhan",colors:["#9400D3","#4B0082"]},{name:"Purple",colors:["#c84e89","#F15F79"]},{name:"Ibtesam",colors:["#00F5A0","#00D9F5"]},{name:"Radioactive Heat",colors:["#F7941E","#72C6EF","#00A651"]},{name:"The Sky And The Sea",colors:["#F7941E","#004E8F"]},{name:"From Ice To Fire",colors:["#72C6EF","#004E8F"]},{name:"Blue & Orange",colors:["#FD8112","#0085CA"]},{name:"Purple Dream",colors:["#bf5ae0","#a811da"]},{name:"Blu",colors:["#00416A","#E4E5E6"]},{name:"Summer Breeze",colors:["#fbed96","#abecd6"]},{name:"Ver",colors:["#FFE000","#799F0C"]},{name:"Ver Black",colors:["#F7F8F8","#ACBB78"]},{name:"Combi",colors:["#00416A","#799F0C","#FFE000"]},{name:"Anwar",colors:["#334d50","#cbcaa5"]},{name:"Bluelagoo",colors:["#0052D4","#4364F7","#6FB1FC"]},{name:"Lunada",colors:["#5433FF","#20BDFF","#A5FECB"]},{name:"Reaqua",colors:["#799F0C","#ACBB78"]},{name:"Mango",colors:["#ffe259","#ffa751"]},{name:"Bupe",colors:["#00416A","#E4E5E6"]},{name:"Rea",colors:["#FFE000","#799F0C"]},{name:"Windy",colors:["#acb6e5","#86fde8"]},{name:"Royal Blue",colors:["#536976","#292E49"]},{name:"Royal Blue + Petrol",colors:["#BBD2C5","#536976","#292E49"]},{name:"Copper",colors:["#B79891","#94716B"]},{name:"Anamnisar",colors:["#9796f0","#fbc7d4"]},{name:"Petrol",colors:["#BBD2C5","#536976"]},{name:"Sky",colors:["#076585","#fff"]},{name:"Sel",colors:["#00467F","#A5CC82"]},{name:"Afternoon",colors:["#000C40","#607D8B"]},{name:"Skyline",colors:["#1488CC","#2B32B2"]},{name:"DIMIGO",colors:["#ec008c","#fc6767"]},{name:"Purple Love",colors:["#cc2b5e","#753a88"]},{name:"Sexy Blue",colors:["#2193b0","#6dd5ed"]},{name:"Blooker20",colors:["#e65c00","#F9D423"]},{name:"Sea Blue",colors:["#2b5876","#4e4376"]},{name:"Nimvelo",colors:["#314755","#26a0da"]},{name:"Hazel",colors:["#77A1D3","#79CBCA","#E684AE"]},{name:"Noon to Dusk",colors:["#ff6e7f","#bfe9ff"]},{name:"YouTube",colors:["#e52d27","#b31217"]},{name:"Cool Brown",colors:["#603813","#b29f94"]},{name:"Harmonic Energy",colors:["#16A085","#F4D03F"]},{name:"Playing with Reds",colors:["#D31027","#EA384D"]},{name:"Sunny Days",colors:["#EDE574","#E1F5C4"]},{name:"Green Beach",colors:["#02AAB0","#00CDAC"]},{name:"Intuitive Purple",colors:["#DA22FF","#9733EE"]},{name:"Emerald Water",colors:["#348F50","#56B4D3"]},{name:"Lemon Twist",colors:["#3CA55C","#B5AC49"]},{name:"Monte Carlo",colors:["#CC95C0","#DBD4B4","#7AA1D2"]},{name:"Horizon",colors:["#003973","#E5E5BE"]},{name:"Rose Water",colors:["#E55D87","#5FC3E4"]},{name:"Frozen",colors:["#403B4A","#E7E9BB"]},{name:"Mango Pulp",colors:["#F09819","#EDDE5D"]},{name:"Bloody Mary",colors:["#FF512F","#DD2476"]},{name:"Aubergine",colors:["#AA076B","#61045F"]},{name:"Aqua Marine",colors:["#1A2980","#26D0CE"]},{name:"Sunrise",colors:["#FF512F","#F09819"]},{name:"Purple Paradise",colors:["#1D2B64","#F8CDDA"]},{name:"Stripe",colors:["#1FA2FF","#12D8FA","#A6FFCB"]},{name:"Sea Weed",colors:["#4CB8C4","#3CD3AD"]},{name:"Pinky",colors:["#DD5E89","#F7BB97"]},{name:"Cherry",colors:["#EB3349","#F45C43"]},{name:"Mojito",colors:["#1D976C","#93F9B9"]},{name:"Juicy Orange",colors:["#FF8008","#FFC837"]},{name:"Mirage",colors:["#16222A","#3A6073"]},{name:"Steel Gray",colors:["#1F1C2C","#928DAB"]},{name:"Kashmir",colors:["#614385","#516395"]},{name:"Electric Violet",colors:["#4776E6","#8E54E9"]},{name:"Venice Blue",colors:["#085078","#85D8CE"]},{name:"Bora Bora",colors:["#2BC0E4","#EAECC6"]},{name:"Moss",colors:["#134E5E","#71B280"]},{name:"Shroom Haze",colors:["#5C258D","#4389A2"]},{name:"Mystic",colors:["#757F9A","#D7DDE8"]},{name:"Midnight City",colors:["#232526","#414345"]},{name:"Sea Blizz",colors:["#1CD8D2","#93EDC7"]},{name:"Opa",colors:["#3D7EAA","#FFE47A"]},{name:"Titanium",colors:["#283048","#859398"]},{name:"Mantle",colors:["#24C6DC","#514A9D"]},{name:"Dracula",colors:["#DC2424","#4A569D"]},{name:"Peach",colors:["#ED4264","#FFEDBC"]},{name:"Moonrise",colors:["#DAE2F8","#D6A4A4"]},{name:"Clouds",colors:["#ECE9E6","#FFFFFF"]},{name:"Stellar",colors:["#7474BF","#348AC7"]},{name:"Bourbon",colors:["#EC6F66","#F3A183"]},{name:"Calm Darya",colors:["#5f2c82","#49a09d"]},{name:"Influenza",colors:["#C04848","#480048"]},{name:"Shrimpy",colors:["#e43a15","#e65245"]},{name:"Army",colors:["#414d0b","#727a17"]},{name:"Miaka",colors:["#FC354C","#0ABFBC"]},{name:"Pinot Noir",colors:["#4b6cb7","#182848"]},{name:"Day Tripper",colors:["#f857a6","#ff5858"]},{name:"Namn",colors:["#a73737","#7a2828"]},{name:"Blurry Beach",colors:["#d53369","#cbad6d"]},{name:"Vasily",colors:["#e9d362","#333333"]},{name:"A Lost Memory",colors:["#DE6262","#FFB88C"]},{name:"Petrichor",colors:["#666600","#999966"]},{name:"Jonquil",colors:["#FFEEEE","#DDEFBB"]},{name:"Sirius Tamed",colors:["#EFEFBB","#D4D3DD"]},{name:"Kyoto",colors:["#c21500","#ffc500"]},{name:"Misty Meadow",colors:["#215f00","#e4e4d9"]},{name:"Aqualicious",colors:["#50C9C3","#96DEDA"]},{name:"Moor",colors:["#616161","#9bc5c3"]},{name:"Almost",colors:["#ddd6f3","#faaca8"]},{name:"Forever Lost",colors:["#5D4157","#A8CABA"]},{name:"Winter",colors:["#E6DADA","#274046"]},{name:"Nelson",colors:["#f2709c","#ff9472"]},{name:"Autumn",colors:["#DAD299","#B0DAB9"]},{name:"Candy",colors:["#D3959B","#BFE6BA"]},{name:"Reef",colors:["#00d2ff","#3a7bd5"]},{name:"The Strain",colors:["#870000","#190A05"]},{name:"Dirty Fog",colors:["#B993D6","#8CA6DB"]},{name:"Earthly",colors:["#649173","#DBD5A4"]},{name:"Virgin",colors:["#C9FFBF","#FFAFBD"]},{name:"Ash",colors:["#606c88","#3f4c6b"]},{name:"Cherryblossoms",colors:["#FBD3E9","#BB377D"]},{name:"Parklife",colors:["#ADD100","#7B920A"]},{name:"Dance To Forget",colors:["#FF4E50","#F9D423"]},{name:"Starfall",colors:["#F0C27B","#4B1248"]},{name:"Red Mist",colors:["#000000","#e74c3c"]},{name:"Teal Love",colors:["#AAFFA9","#11FFBD"]},{name:"Neon Life",colors:["#B3FFAB","#12FFF7"]},{name:"Man of Steel",colors:["#780206","#061161"]},{name:"Amethyst",colors:["#9D50BB","#6E48AA"]},{name:"Cheer Up Emo Kid",colors:["#556270","#FF6B6B"]},{name:"Shore",colors:["#70e1f5","#ffd194"]},{name:"Facebook Messenger",colors:["#00c6ff","#0072ff"]},{name:"SoundCloud",colors:["#fe8c00","#f83600"]},{name:"Behongo",colors:["#52c234","#061700"]},{name:"ServQuick",colors:["#485563","#29323c"]},{name:"Friday",colors:["#83a4d4","#b6fbff"]},{name:"Martini",colors:["#FDFC47","#24FE41"]},{name:"Metallic Toad",colors:["#abbaab","#ffffff"]},{name:"Between The Clouds",colors:["#73C8A9","#373B44"]},{name:"Crazy Orange I",colors:["#D38312","#A83279"]},{name:"Hersheys",colors:["#1e130c","#9a8478"]},{name:"Talking To Mice Elf",colors:["#948E99","#2E1437"]},{name:"Purple Bliss",colors:["#360033","#0b8793"]},{name:"Predawn",colors:["#FFA17F","#00223E"]},{name:"Endless River",colors:["#43cea2","#185a9d"]},{name:"Pastel Orange at the Sun",colors:["#ffb347","#ffcc33"]},{name:"Twitch",colors:["#6441A5","#2a0845"]},{name:"Atlas",colors:["#FEAC5E","#C779D0","#4BC0C8"]},{name:"Instagram",colors:["#833ab4","#fd1d1d","#fcb045"]},{name:"Flickr",colors:["#ff0084","#33001b"]},{name:"Vine",colors:["#00bf8f","#001510"]},{name:"Turquoise flow",colors:["#136a8a","#267871"]},{name:"Portrait",colors:["#8e9eab","#eef2f3"]},{name:"Virgin America",colors:["#7b4397","#dc2430"]},{name:"Koko Caramel",colors:["#D1913C","#FFD194"]},{name:"Fresh Turboscent",colors:["#F1F2B5","#135058"]},{name:"Green to dark",colors:["#6A9113","#141517"]},{name:"Ukraine",colors:["#004FF9","#FFF94C"]},{name:"Curiosity blue",colors:["#525252","#3d72b4"]},{name:"Dark Knight",colors:["#BA8B02","#181818"]},{name:"Piglet",colors:["#ee9ca7","#ffdde1"]},{name:"Lizard",colors:["#304352","#d7d2cc"]},{name:"Sage Persuasion",colors:["#CCCCB2","#757519"]},{name:"Between Night and Day",colors:["#2c3e50","#3498db"]},{name:"Timber",colors:["#fc00ff","#00dbde"]},{name:"Passion",colors:["#e53935","#e35d5b"]},{name:"Clear Sky",colors:["#005C97","#363795"]},{name:"Master Card",colors:["#f46b45","#eea849"]},{name:"Back To Earth",colors:["#00C9FF","#92FE9D"]},{name:"Deep Purple",colors:["#673AB7","#512DA8"]},{name:"Little Leaf",colors:["#76b852","#8DC26F"]},{name:"Netflix",colors:["#8E0E00","#1F1C18"]},{name:"Light Orange",colors:["#FFB75E","#ED8F03"]},{name:"Green and Blue",colors:["#c2e59c","#64b3f4"]},{name:"Poncho",colors:["#403A3E","#BE5869"]},{name:"Back to the Future",colors:["#C02425","#F0CB35"]},{name:"Blush",colors:["#B24592","#F15F79"]},{name:"Inbox",colors:["#457fca","#5691c8"]},{name:"Purplin",colors:["#6a3093","#a044ff"]},{name:"Pale Wood",colors:["#eacda3","#d6ae7b"]},{name:"Haikus",colors:["#fd746c","#ff9068"]},{name:"Pizelex",colors:["#114357","#F29492"]},{name:"Joomla",colors:["#1e3c72","#2a5298"]},{name:"Christmas",colors:["#2F7336","#AA3A38"]},{name:"Minnesota Vikings",colors:["#5614B0","#DBD65C"]},{name:"Miami Dolphins",colors:["#4DA0B0","#D39D38"]},{name:"Forest",colors:["#5A3F37","#2C7744"]},{name:"Nighthawk",colors:["#2980b9","#2c3e50"]},{name:"Superman",colors:["#0099F7","#F11712"]},{name:"Suzy",colors:["#834d9b","#d04ed6"]},{name:"Dark Skies",colors:["#4B79A1","#283E51"]},{name:"Deep Space",colors:["#000000","#434343"]},{name:"Decent",colors:["#4CA1AF","#C4E0E5"]},{name:"Colors Of Sky",colors:["#E0EAFC","#CFDEF3"]},{name:"Purple White",colors:["#BA5370","#F4E2D8"]},{name:"Ali",colors:["#ff4b1f","#1fddff"]},{name:"Alihossein",colors:["#f7ff00","#db36a4"]},{name:"Shahabi",colors:["#a80077","#66ff00"]},{name:"Red Ocean",colors:["#1D4350","#A43931"]},{name:"Tranquil",colors:["#EECDA3","#EF629F"]},{name:"Transfile",colors:["#16BFFD","#CB3066"]},{name:"Sylvia",colors:["#ff4b1f","#ff9068"]},{name:"Sweet Morning",colors:["#FF5F6D","#FFC371"]},{name:"Politics",colors:["#2196f3","#f44336"]},{name:"Bright Vault",colors:["#00d2ff","#928DAB"]},{name:"Solid Vault",colors:["#3a7bd5","#3a6073"]},{name:"Sunset",colors:["#0B486B","#F56217"]},{name:"Grapefruit Sunset",colors:["#e96443","#904e95"]},{name:"Deep Sea Space",colors:["#2C3E50","#4CA1AF"]},{name:"Dusk",colors:["#2C3E50","#FD746C"]},{name:"Minimal Red",colors:["#F00000","#DC281E"]},{name:"Royal",colors:["#141E30","#243B55"]},{name:"Mauve",colors:["#42275a","#734b6d"]},{name:"Frost",colors:["#000428","#004e92"]},{name:"Lush",colors:["#56ab2f","#a8e063"]},{name:"Firewatch",colors:["#cb2d3e","#ef473a"]},{name:"Sherbert",colors:["#f79d00","#64f38c"]},{name:"Blood Red",colors:["#f85032","#e73827"]},{name:"Sun on the Horizon",colors:["#fceabb","#f8b500"]},{name:"IIIT Delhi",colors:["#808080","#3fada8"]},{name:"Jupiter",colors:["#ffd89b","#19547b"]},{name:"50 Shades of Grey",colors:["#bdc3c7","#2c3e50"]},{name:"Dania",colors:["#BE93C5","#7BC6CC"]},{name:"Limeade",colors:["#A1FFCE","#FAFFD1"]},{name:"Disco",colors:["#4ECDC4","#556270"]},{name:"Love Couple",colors:["#3a6186","#89253e"]},{name:"Azure Pop",colors:["#ef32d9","#89fffd"]},{name:"Nepal",colors:["#de6161","#2657eb"]},{name:"Cosmic Fusion",colors:["#ff00cc","#333399"]},{name:"Snapchat",colors:["#fffc00","#ffffff"]},{name:"Ed's Sunset Gradient",colors:["#ff7e5f","#feb47b"]},{name:"Brady Brady Fun Fun",colors:["#00c3ff","#ffff1c"]},{name:"Black Ros\xe9",colors:["#f4c4f3","#fc67fa"]},{name:"80's Purple",colors:["#41295a","#2F0743"]},{name:"Radar",colors:["#A770EF","#CF8BF3","#FDB99B"]},{name:"Ibiza Sunset",colors:["#ee0979","#ff6a00"]},{name:"Dawn",colors:["#F3904F","#3B4371"]},{name:"Mild",colors:["#67B26F","#4ca2cd"]},{name:"Vice City",colors:["#3494E6","#EC6EAD"]},{name:"Jaipur",colors:["#DBE6F6","#C5796D"]},{name:"Jodhpur",colors:["#9CECFB","#65C7F7","#0052D4"]},{name:"Cocoaa Ice",colors:["#c0c0aa","#1cefff"]},{name:"EasyMed",colors:["#DCE35B","#45B649"]},{name:"Rose Colored Lenses",colors:["#E8CBC0","#636FA4"]},{name:"What lies Beyond",colors:["#F0F2F0","#000C40"]},{name:"Roseanna",colors:["#FFAFBD","#ffc3a0"]},{name:"Honey Dew",colors:["#43C6AC","#F8FFAE"]},{name:"Under the Lake",colors:["#093028","#237A57"]},{name:"The Blue Lagoon",colors:["#43C6AC","#191654"]},{name:"Can You Feel The Love Tonight",colors:["#4568DC","#B06AB3"]},{name:"Very Blue",colors:["#0575E6","#021B79"]},{name:"Love and Liberty",colors:["#200122","#6f0000"]},{name:"Orca",colors:["#44A08D","#093637"]},{name:"Venice",colors:["#6190E8","#A7BFE8"]},{name:"Pacific Dream",colors:["#34e89e","#0f3443"]},{name:"Learning and Leading",colors:["#F7971E","#FFD200"]},{name:"Celestial",colors:["#C33764","#1D2671"]},{name:"Purplepine",colors:["#20002c","#cbb4d4"]},{name:"Sha la la",colors:["#D66D75","#E29587"]},{name:"Mini",colors:["#30E8BF","#FF8235"]},{name:"Maldives",colors:["#B2FEFA","#0ED2F7"]},{name:"Cinnamint",colors:["#4AC29A","#BDFFF3"]},{name:"Html",colors:["#E44D26","#F16529"]},{name:"Coal",colors:["#EB5757","#000000"]},{name:"Sunkist",colors:["#F2994A","#F2C94C"]},{name:"Blue Skies",colors:["#56CCF2","#2F80ED"]},{name:"Chitty Chitty Bang Bang",colors:["#007991","#78ffd6"]},{name:"Visions of Grandeur",colors:["#000046","#1CB5E0"]},{name:"Crystal Clear",colors:["#159957","#155799"]},{name:"Mello",colors:["#c0392b","#8e44ad"]},{name:"Compare Now",colors:["#EF3B36","#FFFFFF"]},{name:"Meridian",colors:["#283c86","#45a247"]},{name:"Relay",colors:["#3A1C71","#D76D77","#FFAF7B"]},{name:"Alive",colors:["#CB356B","#BD3F32"]},{name:"Scooter",colors:["#36D1DC","#5B86E5"]},{name:"Terminal",colors:["#000000","#0f9b0f"]},{name:"Telegram",colors:["#1c92d2","#f2fcfe"]},{name:"Crimson Tide",colors:["#642B73","#C6426E"]},{name:"Socialive",colors:["#06beb6","#48b1bf"]},{name:"Subu",colors:["#0cebeb","#20e3b2","#29ffc6"]},{name:"Broken Hearts",colors:["#d9a7c7","#fffcdc"]},{name:"Kimoby Is The New Blue",colors:["#396afc","#2948ff"]},{name:"Dull",colors:["#C9D6FF","#E2E2E2"]},{name:"Purpink",colors:["#7F00FF","#E100FF"]},{name:"Orange Coral",colors:["#ff9966","#ff5e62"]},{name:"Summer",colors:["#22c1c3","#fdbb2d"]},{name:"King Yna",colors:["#1a2a6c","#b21f1f","#fdbb2d"]},{name:"Velvet Sun",colors:["#e1eec3","#f05053"]},{name:"Zinc",colors:["#ADA996","#F2F2F2","#DBDBDB","#EAEAEA"]},{name:"Hydrogen",colors:["#667db6","#0082c8","#0082c8","#667db6"]},{name:"Argon",colors:["#03001e","#7303c0","#ec38bc","#fdeff9"]},{name:"Lithium",colors:["#6D6027","#D3CBB8"]},{name:"Digital Water",colors:["#74ebd5","#ACB6E5"]},{name:"Orange Fun",colors:["#fc4a1a","#f7b733"]},{name:"Rainbow Blue",colors:["#00F260","#0575E6"]},{name:"Pink Flavour",colors:["#800080","#ffc0cb"]},{name:"Sulphur",colors:["#CAC531","#F3F9A7"]},{name:"Selenium",colors:["#3C3B3F","#605C3C"]},{name:"Delicate",colors:["#D3CCE3","#E9E4F0"]},{name:"Ohhappiness",colors:["#00b09b","#96c93d"]},{name:"Lawrencium",colors:["#0f0c29","#302b63","#24243e"]},{name:"Relaxing red",colors:["#fffbd5","#b20a2c"]},{name:"Taran Tado",colors:["#23074d","#cc5333"]},{name:"Bighead",colors:["#c94b4b","#4b134f"]},{name:"Sublime Vivid",colors:["#FC466B","#3F5EFB"]},{name:"Sublime Light",colors:["#FC5C7D","#6A82FB"]},{name:"Pun Yeta",colors:["#108dc7","#ef8e38"]},{name:"Quepal",colors:["#11998e","#38ef7d"]},{name:"Sand to Blue",colors:["#3E5151","#DECBA4"]},{name:"Wedding Day Blues",colors:["#40E0D0","#FF8C00","#FF0080"]},{name:"Shifter",colors:["#bc4e9c","#f80759"]},{name:"Red Sunset",colors:["#355C7D","#6C5B7B","#C06C84"]},{name:"Moon Purple",colors:["#4e54c8","#8f94fb"]},{name:"Pure Lust",colors:["#333333","#dd1818"]},{name:"Slight Ocean View",colors:["#a8c0ff","#3f2b96"]},{name:"eXpresso",colors:["#ad5389","#3c1053"]},{name:"Shifty",colors:["#636363","#a2ab58"]},{name:"Vanusa",colors:["#DA4453","#89216B"]},{name:"Evening Night",colors:["#005AA7","#FFFDE4"]},{name:"Magic",colors:["#59C173","#a17fe0","#5D26C1"]},{name:"Margo",colors:["#FFEFBA","#FFFFFF"]},{name:"Blue Raspberry",colors:["#00B4DB","#0083B0"]},{name:"Citrus Peel",colors:["#FDC830","#F37335"]},{name:"Sin City Red",colors:["#ED213A","#93291E"]},{name:"Rastafari",colors:["#1E9600","#FFF200","#FF0000"]},{name:"Summer Dog",colors:["#a8ff78","#78ffd6"]},{name:"Wiretap",colors:["#8A2387","#E94057","#F27121"]},{name:"Burning Orange",colors:["#FF416C","#FF4B2B"]},{name:"Ultra Voilet",colors:["#654ea3","#eaafc8"]},{name:"By Design",colors:["#009FFF","#ec2F4B"]},{name:"Kyoo Tah",colors:["#544a7d","#ffd452"]},{name:"Kye Meh",colors:["#8360c3","#2ebf91"]},{name:"Kyoo Pal",colors:["#dd3e54","#6be585"]},{name:"Metapolis",colors:["#659999","#f4791f"]},{name:"Flare",colors:["#f12711","#f5af19"]},{name:"Witching Hour",colors:["#c31432","#240b36"]},{name:"Azur Lane",colors:["#7F7FD5","#86A8E7","#91EAE4"]},{name:"Neuromancer",colors:["#f953c6","#b91d73"]},{name:"Harvey",colors:["#1f4037","#99f2c8"]},{name:"Amin",colors:["#8E2DE2","#4A00E0"]},{name:"Memariani",colors:["#aa4b6b","#6b6b83","#3b8d99"]},{name:"Yoda",colors:["#FF0099","#493240"]},{name:"Cool Sky",colors:["#2980B9","#6DD5FA","#FFFFFF"]},{name:"Dark Ocean",colors:["#373B44","#4286f4"]},{name:"Evening Sunshine",colors:["#b92b27","#1565C0"]},{name:"JShine",colors:["#12c2e9","#c471ed","#f64f59"]},{name:"Moonlit Asteroid",colors:["#0F2027","#203A43","#2C5364"]},{name:"MegaTron",colors:["#C6FFDD","#FBD786","#f7797d"]},{name:"Cool Blues",colors:["#2193b0","#6dd5ed"]},{name:"Piggy Pink",colors:["#ee9ca7","#ffdde1"]},{name:"Grade Grey",colors:["#bdc3c7","#2c3e50"]},{name:"Telko",colors:["#F36222","#5CB644","#007FC3"]},{name:"Zenta",colors:["#2A2D3E","#FECB6E"]},{name:"Electric Peacock",colors:["#8a2be2","#0000cd","#228b22","#ccff00"]},{name:"Under Blue Green",colors:["#051937","#004d7a","#008793","#00bf72","#a8eb12"]},{name:"Lensod",colors:["#6025F5","#FF5555"]},{name:"Newspaper",colors:["#8a2be2","#ffa500","#f8f8ff"]},{name:"Dark Blue Gradient",colors:["#2774ae","#002E5D","#002E5D"]},{name:"Dark Blu Two",colors:["#004680","#4484BA"]},{name:"Lemon Lime",colors:["#7ec6bc","#ebe717"]},{name:"Beleko",colors:["#ff1e56","#f9c942","#1e90ff"]},{name:"Mango Papaya",colors:["#de8a41","#2ada53"]},{name:"Unicorn Rainbow",colors:["#f7f0ac","#acf7f0","#f0acf7"]},{name:"Flame",colors:["#ff0000","#fdcf58"]},{name:"Blue Red",colors:["#36B1C7","#960B33"]},{name:"Twitter",colors:["#1DA1F2","#009ffc"]},{name:"Blooze",colors:["#6da6be","#4b859e","#6da6be"]},{name:"Blue Slate",colors:["#B5B9FF","#2B2C49"]},{name:"Space Light Green",colors:["#9FA0A8","#5C7852"]},{name:"Flower",colors:["#DCFFBD","#CC86D1"]},{name:"Elate The Euge",colors:["#8BDEDA","43ADD0","998EE0","E17DC2","EF9393"]},{name:"Peach Sea",colors:["#E6AE8C","#A8CECF"]},{name:"Abbas",colors:["#00fff0","#0083fe"]},{name:"Winter Woods",colors:["#333333","#a2ab58","#A43931"]},{name:"Ameena",colors:["#0c0c6d","#de512b","#98d0c1","#5bb226","#023c0d"]},{name:"Emerald Sea",colors:["#05386b","#5cdb95"]},{name:"Bleem",colors:["#4284DB","#29EAC4"]},{name:"Coffee Gold",colors:["#554023","#c99846"]},{name:"Compass",colors:["#516b8b","#056b3b"]},{name:"Andreuzza's",colors:["#D70652","#FF025E"]},{name:"Moonwalker",colors:["#152331","#000000"]},{name:"Whinehouse",colors:["#f7f7f7","#b9a0a0","#794747","#4e2020","#111111"]},{name:"Hyper Blue",colors:["#59CDE9","#0A2A88"]},{name:"Racker",colors:["#EB0000","#95008A","#3300FC"]},{name:"After the Rain",colors:["#ff75c3","#ffa647","#ffe83f","#9fff5b","#70e2ff","#cd93ff"]},{name:"Neon Green",colors:["#81ff8a","#64965e"]},{name:"Dusty Grass",colors:["#d4fc79","#96e6a1"]},{name:"Visual Blue",colors:["#003d4d","#00c996"]}];
	
		// Create the popup container
		const popup = document.createElement("div");
		popup.classList.add("gradient-picker-popup");
		
		
		// Close Button
		const templatesWrapper = document.createElement("div");
		templatesWrapper.classList.add("gradients-templates");
	
		// Close Button
		const closeButton = document.createElement("button");
		closeButton.classList.add("gradient-picker-close");
		closeButton.addEventListener("click", () => this.closeGradientPopup(popup));
		popup.appendChild(closeButton);
	
		// Populate gradients
		gradients.forEach((gradient) => {
			const preview = document.createElement("div");
			preview.classList.add("gradient-preview");
			preview.style.background = `linear-gradient(to right, ${gradient.colors.join(", ")})`;
		
			// Create a span to hold the gradient name
			const nameSpan = document.createElement("span");
			nameSpan.textContent = gradient.name;
			nameSpan.classList.add("gradient-name");
		
			// Append the span inside the preview div
			preview.appendChild(nameSpan);
		
			// Event: Apply gradient on click
			preview.addEventListener("click", () => {
				this.applyPresetGradient(gradient.colors);
				this.closeGradientPopup(popup); // Close popup after selection
			});
		
			templatesWrapper.appendChild(preview);
		});
		
		popup.appendChild(templatesWrapper);
	
		// Add popup to the body
		document.body.appendChild(popup);
	
		// Ensure clicking outside the popup closes it
		setTimeout(() => {
			document.addEventListener("click", this.popupOutsideClick);
		}, 10);
	}
	
	// Close the popup and remove event listeners
	closeGradientPopup(popup) {
		popup.remove();
		document.removeEventListener("click", this.popupOutsideClick);
	}
	
	// Close if clicked outside the popup
	popupOutsideClick = (event) => {
		const popup = document.querySelector(".gradient-picker-popup");
		if (popup && !popup.contains(event.target) && !event.target.classList.contains("popup-button")) {
			this.closeGradientPopup(popup);
		}
	};
	
	applyPresetGradient(colors) {
		const step = 100 / (colors.length - 1);
		this.colorStops = colors.map((color, index) => ({
			color: this.ensureRgba(color),
			position: index * step,
		}));
	
		this.options.defaultDirection = "to right"; // Force direction to right
		this.gradient = this.createGradientString();
		this.renderColorStops();
		this.updateGradientDirection(this.options.defaultDirection);
		this.updatePreview();
		this.initializeDirectionDot(); // Update dot position
	}
	
	/**
	 * Function to handle user input and refresh the gradient
	 */
	applyManualGradientUpdate() {
		this.colorStops = this.parseGradientString(this.gradient) || this.options.defaultColorStops;
		this.updateGradientForSlider();
		this.renderColorStops();
		this.updateGradientDirection(this.options.defaultDirection);
		this.updatePreview();
		this.initializeDirectionDot(); // Ensure direction dot is updated
	}
}
