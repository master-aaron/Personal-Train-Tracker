document.addEventListener("DOMContentLoaded", function () {
	const stopsList = document.getElementById("stopsList");
	const message = document.getElementById("message");
	const directionButtons = document.querySelectorAll(".direction-button");
	const lineSelect = document.getElementById("lineSelect");
	let stops = [];
	const apiKey = "2a9bf598d2584bda8a3aec32f176044e";
	let direction = 1; // Default direction is Inbound
	let selectedLine = getCookie("selectedLine") || "Green-E"; // Get from cookie or default to "Green-E"

	const lineColors = {
		Red: { primary: "#FF0000", lighter: "#ffdfdf" },
		Blue: { primary: "#0000FF", lighter: "#CCCCFF" },
		Orange: { primary: "#ee9b00", lighter: "#fff6d9" },
		"Green-B": { primary: "#008000", lighter: "#dcffdc" },
		"Green-C": { primary: "#008000", lighter: "#dcffdc" },
		"Green-D": { primary: "#008000", lighter: "#dcffdc" },
		"Green-E": { primary: "#008000", lighter: "#dcffdc" },
	};

	const locationStatus = {
		IN_TRANSIT_TO: "In transit to",
		STOPPED_AT: "Stopped at",
		INCOMING_AT: "Incoming at",
	};

	function setCookie(name, value, days) {
		const date = new Date();
		date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
		const expires = "expires=" + date.toUTCString();
		document.cookie = name + "=" + value + ";" + expires + ";path=/";
	}

	function getCookie(name) {
		const cname = name + "=";
		const decodedCookie = decodeURIComponent(document.cookie);
		const ca = decodedCookie.split(";");
		for (let i = 0; i < ca.length; i++) {
			let c = ca[i].trim();
			if (c.indexOf(cname) == 0) {
				return c.substring(cname.length, c.length);
			}
		}
		return "";
	}

	async function fetchSubwayLines() {
		const url = `https://api-v3.mbta.com/routes?filter[type]=0,1&api_key=${apiKey}`;
		try {
			const response = await fetch(url);
			const data = await response.json();
			const allLines = data.data;
			const lines = allLines.filter((line) => line.id != "Mattapan");
			lines.forEach((line) => {
				const option = document.createElement("option");
				option.value = line.id;
				option.textContent = line.attributes.long_name;
				if (line.id === selectedLine) {
					option.selected = true;
				}
				lineSelect.appendChild(option);
			});
			updateLineColors(selectedLine);
		} catch (error) {
			message.textContent = "Error fetching subway lines.";
			message.style.color = "red";
			console.error("Error fetching subway lines:", error);
		}
	}

	async function fetchStops() {
		const url = `https://api-v3.mbta.com/stops?filter[route]=${selectedLine}&filter[direction_id]=1&api_key=${apiKey}`;
		try {
			const response = await fetch(url);
			const data = await response.json();
			stops = data.data.map((stop) => ({
				id: stop.id,
				name: stop.attributes.name,
			}));
			updateStopsList([]);
		} catch (error) {
			message.textContent = "Error fetching stops data.";
			message.style.color = "red";
			console.error("Error fetching stops data:", error);
		}
	}

	async function fetchStopNameFromId(stopId) {
		const url = `https://api-v3.mbta.com/stops/${stopId}?api_key=${apiKey}`;
		try {
			const response = await fetch(url);
			const data = await response.json();
			return data.data.attributes.name;
		} catch (error) {
			console.error("Error fetching stop name:", error);
		}
	}

	async function fetchTrainLocations() {
		const url = `https://api-v3.mbta.com/vehicles?filter[route]=${selectedLine}&filter[direction_id]=${direction}&api_key=${apiKey}`;
		try {
			const response = await fetch(url);
			const data = await response.json();
			const vehicles = data.data;
			if (vehicles.length > 0) {
				const vehicleLocations = await Promise.all(
					vehicles.map(async (vehicle) => {
						const stopId = vehicle.relationships.stop.data.id;
						const stopName = await fetchStopNameFromId(stopId);
						const status = vehicle.attributes.current_status;
						return { stopId, stopName, status };
					})
				);
				updateStopsList(vehicleLocations);
				message.textContent = "Displaying all train locations.";
				message.style.color = "green";
			} else {
				message.textContent = "No trains currently available.";
				message.style.color = "red";
			}
		} catch (error) {
			message.textContent = "Error fetching train data.";
			message.style.color = "red";
			console.error("Error fetching train data:", error);
		}
	}

	function updateStopsList(vehicleLocations) {
		stopsList.innerHTML = "";
		stops.forEach((stop) => {
			const li = document.createElement("li");
			li.textContent = stop.name;
			const vehicleAtStop = vehicleLocations.find(
				(location) => location.stopName === stop.name
			);
			if (vehicleAtStop) {
				li.classList.add("current-location");
				const status = vehicleAtStop.status;
				const statusSpan = document.createElement("span");
				statusSpan.textContent = `   (${locationStatus[status]})`;
				li.appendChild(statusSpan);
			}
			stopsList.appendChild(li);
		});
	}

	function handleDirectionButtonClick(event) {
		directionButtons.forEach((button) =>
			button.classList.remove("selected")
		);
		event.target.classList.add("selected");
		direction = parseInt(event.target.dataset.direction);
		fetchStops().then(() => {
			fetchTrainLocations();
		});
	}

	function handleLineSelectChange() {
		selectedLine = lineSelect.value;
		setCookie("selectedLine", selectedLine, 7); // Save selected line in a cookie for 7 days
		updateLineColors(selectedLine);
		fetchStops().then(() => {
			fetchTrainLocations();
		});
	}

	function updateLineColors(line) {
		const color = lineColors[line] || {
			primary: "#000000",
			lighter: "#f0f0f0",
		};
		document.documentElement.style.setProperty(
			"--line-color",
			color.primary
		);
		document.documentElement.style.setProperty(
			"--line-color-lighter",
			color.lighter
		);
	}

	directionButtons.forEach((button) => {
		button.addEventListener("click", handleDirectionButtonClick);
	});

	lineSelect.addEventListener("change", handleLineSelectChange);

	fetchSubwayLines().then(() => {
		fetchStops().then(() => {
			fetchTrainLocations();
			setInterval(fetchTrainLocations, 1000);
		});
	});
});
