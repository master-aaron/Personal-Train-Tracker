document.addEventListener("DOMContentLoaded", function () {
	const stopsList = document.getElementById("stopsList");
	const message = document.getElementById("message");
	const directionButtons = document.querySelectorAll("#directionButton");
	let stops = [];
	const apiKey = "2a9bf598d2584bda8a3aec32f176044e";
	let direction = 1; // Default direction is Outbound

	async function fetchStops() {
		const url = `https://api-v3.mbta.com/stops?filter[route]=Green-E&filter[direction_id]=1&api_key=${apiKey}`;

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
		const url = `https://api-v3.mbta.com/vehicles?filter[route]=Green-E&filter[direction_id]=${direction}&api_key=${apiKey}`;

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
				statusSpan.textContent = `   (${status})`;
				li.appendChild(statusSpan);
			}
			stopsList.appendChild(li);
		});
	}

	// Function to handle direction button click
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

	// Add event listener to direction buttons
	directionButtons.forEach((button) => {
		button.addEventListener("click", handleDirectionButtonClick);
	});

	// Initial fetch of stops and set interval to fetch train location every 6 seconds
	fetchStops().then(() => {
		fetchTrainLocations();
		setInterval(fetchTrainLocations, 1000);
	});
});
