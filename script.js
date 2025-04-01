// Firebase Initialization
const firebaseConfig = {
    apiKey: "AIzaSyCVH9tFfsmm040flswAVgPoXWAqcb_CDqY",
    authDomain: "rsr-event-management.firebaseapp.com",
    projectId: "rsr-event-management",
    storageBucket: "rsr-event-management.firebasestorage.app",
    messagingSenderId: "586578702881",
    appId: "1:586578702881:web:e9091b4a11576eaa35a960"
  };

// Initialize Firebase
let app, db, eventsRef, clientsRef, carsRef, circuitsRef;
try {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    eventsRef = db.ref('events');
    clientsRef = db.ref('clients');
    carsRef = db.ref('cars');
    circuitsRef = db.ref('circuits');
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

// Data storage
let events = [];
let clients = [];
let cars = [];
let circuits = [];
let currentEventIndex = null;
let currentParticipantIndex = null;
let currentClientIndex = null;
let currentCarIndex = null;
let currentCircuitIndex = null;
let selectedClients = new Set();


function saveData() {
    if (!db) {
        console.error("Database not initialized. Cannot save data.");
        return;
    }
    console.log("Saving data:", { events, clients, cars, circuits });
    eventsRef.set(events).catch(error => console.error("Error saving events:", error));
    clientsRef.set(clients).catch(error => console.error("Error saving clients:", error));
    carsRef.set(cars).catch(error => console.error("Error saving cars:", error));
    circuitsRef.set(circuits).catch(error => console.error("Error saving circuits:", error));
}

// Load data from Firebase
function loadData() {
    if (!db) {
        console.error("Database not initialized. Cannot load data.");
        return;
    }
    eventsRef.once('value', (snapshot) => {
        events = snapshot.val() || [];
        updateEventsTable();
    }).catch(error => console.error("Error loading events:", error));
    clientsRef.once('value', (snapshot) => {
        clients = snapshot.val() || [];
        updateClientsTable();
    }).catch(error => console.error("Error loading clients:", error));
    carsRef.once('value', (snapshot) => {
        cars = snapshot.val() || [];
        updateCarsTable();
    }).catch(error => console.error("Error loading cars:", error));
    circuitsRef.once('value', (snapshot) => {
        circuits = snapshot.val() || [];
        updateCircuitsTable();
    }).catch(error => console.error("Error loading circuits:", error));
}

// Call loadData when the page loads
window.onload = function() {
    if (db) {
        loadData();
        showSection('home'); // Show home screen by default
    } else {
        console.error("Firebase not ready on page load.");
        showSection('home'); // Show home screen even if Firebase fails
    }
};

// Call loadData when the page loads
window.onload = function() {
    loadData();
};

function isValidDate(year, month, day) {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() == year && date.getMonth() == month - 1 && date.getDate() == day;
}

// Show a specific section and hide others
function showSection(sectionId) {
    loadData(); // Ensure latest data is loaded
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    const activeSection = document.getElementById(sectionId);
    activeSection.style.display = 'block';

    if (sectionId === 'events') {
        document.getElementById('eventsControls').style.display = 'block';
        document.getElementById('eventsTable').classList.remove('hidden');
        document.getElementById('addEventForm').style.display = 'none';
        document.getElementById('editEventForm').style.display = 'none';
        // updateEventsTable() is called by loadData
    } else if (sectionId === 'clients') {
        document.getElementById('clientsTable').classList.remove('hidden');
        document.getElementById('addClientForm').style.display = 'none';
        document.getElementById('editClientForm').style.display = 'none';
        document.getElementById('importClientsForm').style.display = 'none';
        // updateClientsTable() is called by loadData
    } else if (sectionId === 'cars') {
        document.getElementById('carsTable').classList.remove('hidden');
        document.getElementById('addCarForm').style.display = 'none';
        document.getElementById('editCarForm').style.display = 'none';
        document.getElementById('importCarsForm').style.display = 'none';
        // updateCarsTable() is called by loadData
    } else if (sectionId === 'circuits') {
        document.getElementById('circuitsTable').classList.remove('hidden');
        document.getElementById('addCircuitForm').style.display = 'none';
        document.getElementById('editCircuitForm').style.display = 'none';
        document.getElementById('importCircuitsForm').style.display = 'none';
        // updateCircuitsTable() is called by loadData
    } else if (sectionId === 'priceList') {
        updatePriceListTable();
    }
}

// --- Events Section ---

function showAddEventForm() {
    document.getElementById('addEventForm').style.display = 'block';
    document.getElementById('eventsTable').classList.add('hidden'); // Hide only the table
    // Do not hide #eventsControls; let the Add Event button remain visible
    document.getElementById('eventDays').addEventListener('change', updateEventDaysInputs);
}

function updateEventDaysInputs() {
    const numDays = parseInt(document.getElementById('eventDays').value) || 0;
    const daysInputs = document.getElementById('eventDaysInputs');
    daysInputs.innerHTML = '';
    for (let i = 0; i < numDays; i++) {
        daysInputs.innerHTML += `
            <div>
                <h4>Day ${i + 1}</h4>
                <label>Date: <input type="date" id="eventDay${i}"></label>
            </div>
        `;
    }
}

function addEvent() {
    const name = document.getElementById('eventName').value;
    const numDays = parseInt(document.getElementById('eventDays').value) || 0;
    if (!name || numDays < 1) {
        alert("Please enter a valid event name and number of days.");
        return;
    }

    const days = [];
    for (let i = 0; i < numDays; i++) {
        const dateInput = document.getElementById(`eventDay${i}`).value;
        if (!dateInput) {
            alert(`Please select a date for Day ${i + 1}.`);
            return;
        }
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) {
            alert(`Invalid date selected for Day ${i + 1}.`);
            return;
        }
        const formattedDate = dateInput;
        days.push({ date: formattedDate, circuit: null });
    }

    events.push({
        name,
        days,
        participants: [],
        cars_assigned: {},
        available_cars: [],
        pricing: {}
    });
    saveData();
    document.getElementById('addEventForm').style.display = 'none';
    document.getElementById('eventsTable').classList.remove('hidden');
    updateEventsTable();
}

function updateEventsTable() {
    const tbody = document.querySelector('#eventsTable tbody');
    tbody.innerHTML = '';
    events.forEach((event, index) => {
        const dates = event.days.map(day => new Date(day.date));
        const years = [...new Set(dates.map(date => date.getFullYear()))].join(', ');
        const months = [...new Set(dates.map(date => date.toLocaleString('default', { month: 'short' })))]
            .join('/');

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${event.name}</td>
            <td>${years} (${months})</td>
            <td>
                <button onclick="editEvent(${index})">Edit</button>
                <button onclick="viewEvent(${index})">Overview</button>
                <button onclick="deleteEvent(${index})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    document.getElementById('eventsTable').style.display = 'table'; // Ensure table is visible
}

function editEvent(index) {
    currentEventIndex = index;
    const event = events[index];

    // Populate the edit form
    document.getElementById('editEventName').textContent = event.name;
    const daysDiv = document.getElementById('editEventDays');
    daysDiv.innerHTML = '';
    event.days.forEach((day, i) => {
        daysDiv.innerHTML += `<p>Day ${i + 1}: ${day.date}, Circuit: ${day.circuit ? day.circuit.name : 'Not Assigned'}</p>`;
    });

    // Populate the event details buttons
    document.getElementById('eventDetails').innerHTML = `
        <button onclick="showEditEventDetailsForm()">Edit Event Details</button>
        <button onclick="assignCircuits()">Assign Circuits</button>
        <button onclick="assignCarsPricing()">Assign Cars</button>
        <button onclick="toggleParticipantsSection()">Add Participants</button>
        <button onclick="enterDrivenData()">Enter kms/laps done</button>
        <button onclick="clientPackage()">Client Package</button>
        <button onclick="processBalances()">Add payments</button>
        <button onclick="viewEvent(${index})">View Event Overview</button>
    `;

    // Hide the events table and controls, show the edit form
    document.getElementById('eventsTable').style.display = 'none'; // Directly hide the table
    document.getElementById('eventsControls').style.display = 'none'; // Hide the "Add Event" button
    document.getElementById('editEventForm').style.display = 'block'; // Show edit form
    document.getElementById('addEventForm').style.display = 'none'; // Ensure add form is hidden

    // Ensure all other sub-forms are hidden initially
    hideAllEditForms();

    updateParticipantsTable(); // Initialize participants table if needed
}



function toggleParticipantsSection() {
    hideAllEditForms();
    const section = document.getElementById('participantsSection');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
    updateParticipantsTable();
    document.getElementById('clientMultiSelect').style.display = 'none';
}

function updateParticipantsTable() {
    const event = events[currentEventIndex];
    const header = document.getElementById('participantsTableHeader');
    const tbody = document.getElementById('participantsTableBody');

    // Build header
    let headerHTML = '<tr><th>Client</th>';
    event.days.forEach((day, i) => {
        headerHTML += `<th>Day ${i + 1} (${day.date}, ${day.circuit ? day.circuit.name : 'N/A'})</th>`;
    });
    headerHTML += '<th>Actions</th></tr>';
    header.innerHTML = headerHTML;

    // Build body with only added participants
    tbody.innerHTML = '';
    event.participants.forEach((participant, participantIndex) => {
        const row = document.createElement('tr');
        let rowHTML = `<td>${participant.client.name} ${participant.client.surname}</td>`;

        event.days.forEach((day, dayIndex) => {
            const allCars = event.available_cars.map(plate => {
                const car = cars.find(c => c.license_plate === plate);
                return `<option value="${plate}">${car ? `${car.model} (${plate})` : plate}</option>`;
            }).join('');
            const circuit = day.circuit;
            const packageOptions = circuit && circuit.pricing_type === "per lap" 
                ? `<option value="basic">Basic</option><option value="fuel_inc">Fuel-Inc</option><option value="all_inc">All-Inc</option>`
                : `<option value="basic">Basic</option><option value="fuel_inc">Fuel-Inc</option>`;

            const carsForDay = participant.car_per_day[dayIndex] || [];
            const packagesForDay = participant.package_per_day[dayIndex] || [];

            let carSelections = '';
            carsForDay.forEach((carPlate, carIdx) => {
                carSelections += `
                    <div class="car-selection">
                        <select id="car_${participantIndex}_${dayIndex}_${carIdx}">
                            <option value="">Select Car</option>
                            ${allCars.replace(`value="${carPlate}"`, `value="${carPlate}" selected`)}
                        </select>
                        <select id="package_${participantIndex}_${dayIndex}_${carIdx}">
                            ${packageOptions.replace(`value="${packagesForDay[carIdx]}"`, `value="${packagesForDay[carIdx]}" selected`)}
                        </select>
                        <button class="remove-car-btn" onclick="this.parentElement.remove()">Remove</button>
                    </div>
                `;
            });

            rowHTML += `
                <td>
                    <div class="car-selection-group">
                        ${carSelections}
                        <button class="add-car-btn" onclick="addCarSelection(${participantIndex}, ${dayIndex})">Add Car</button>
                    </div>
                </td>
            `;
        });

        rowHTML += `<td><button class="remove-participant-btn" onclick="removeParticipant(${participantIndex})">Remove</button></td>`;
        row.innerHTML = rowHTML;
        tbody.appendChild(row);
    });

    // Initialize multi-select options
    filterClients();
}

// Filter clients based on search input
function filterClients() {
    const searchTerm = document.getElementById('clientSearch').value.toLowerCase();
    const dropdown = document.getElementById('clientMultiSelect');
    const clientOptions = document.getElementById('clientOptions');
    const event = events[currentEventIndex];
    const addedClients = event.participants.map(p => `${p.client.name} ${p.client.surname}`);
    const filteredClients = clients.filter(client => {
        const fullName = `${client.name} ${client.surname}`.toLowerCase();
        return fullName.includes(searchTerm) && !addedClients.includes(fullName);
    });

    clientOptions.innerHTML = filteredClients.map(client => {
        const fullName = `${client.name} ${client.surname}`;
        const isChecked = selectedClients.has(fullName) ? 'checked' : '';
        return `<label><input type="checkbox" value="${fullName}" class="client-checkbox" ${isChecked}>${fullName}</label>`;
    }).join('');
    dropdown.style.display = filteredClients.length > 0 ? 'block' : 'none';
}

// Update selectedClients when checkboxes change
document.addEventListener('change', function(event) {
    if (event.target.classList.contains('client-checkbox')) {
        const fullName = event.target.value;
        if (event.target.checked) selectedClients.add(fullName);
        else selectedClients.delete(fullName);
    }
});

document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('clientMultiSelect');
    const searchInput = document.getElementById('clientSearch');
    const isClickInsideDropdown = dropdown.contains(event.target);
    const isClickInsideSearch = searchInput.contains(event.target);

    if (!isClickInsideDropdown && !isClickInsideSearch && dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
    }
});

document.getElementById('clientSearch').addEventListener('click', function(e) {
    const dropdown = document.getElementById('clientMultiSelect');
    const clientOptions = document.getElementById('clientOptions');
    const event = events[currentEventIndex];
    const addedClients = event.participants.map(p => `${p.client.name} ${p.client.surname}`);
    const availableClients = clients.filter(c => !addedClients.includes(`${c.name} ${c.surname}`));

    clientOptions.innerHTML = availableClients.map(client => {
        const fullName = `${client.name} ${client.surname}`;
        const isChecked = selectedClients.has(fullName) ? 'checked' : '';
        return `<label><input type="checkbox" value="${fullName}" class="client-checkbox" ${isChecked}>${fullName}</label>`;
    }).join('');
    dropdown.style.display = 'block';
    e.stopPropagation(); // Prevent click from bubbling up and triggering the outside click handler immediately
});

// Add selected clients from multi-select
function addSelectedClients() {
    const event = events[currentEventIndex];
    selectedClients.forEach(selectedClientName => {
        const client = clients.find(c => `${c.name} ${c.surname}` === selectedClientName);
        if (client && !event.participants.some(p => `${p.client.name} ${p.client.surname}` === selectedClientName)) {
            const carsPerDay = Array(event.days.length).fill([]);
            const packagesPerDay = Array(event.days.length).fill([]);
            const drivenPerDay = Array(event.days.length).fill([]);
            const paidPerDay = Array(event.days.length).fill(0);

            event.participants.push({
                client,
                car_per_day: carsPerDay,
                package_per_day: packagesPerDay,
                driven_per_day: drivenPerDay,
                paid_per_day: paidPerDay,
                package_payment: {},
                payment_details: [],
                paid_status: false
            });
            selectedClients.delete(selectedClientName);
        }
    });

    updateParticipantsTable();
    document.getElementById('clientSearch').value = '';
    document.getElementById('clientMultiSelect').style.display = 'none';
}

// Add a new car selection (unchanged)
function addCarSelection(participantIndex, dayIndex) {
    const event = events[currentEventIndex];
    const tbody = document.getElementById('participantsTableBody');
    const row = tbody.children[participantIndex];
    const cell = row.cells[dayIndex + 1];
    const group = cell.querySelector('.car-selection-group');
    const carCount = group.querySelectorAll('.car-selection').length;

    const allCars = event.available_cars.map(plate => {
        const car = cars.find(c => c.license_plate === plate);
        return `<option value="${plate}">${car ? `${car.model} (${plate})` : plate}</option>`;
    }).join('');
    const circuit = event.days[dayIndex].circuit;
    const packageOptions = circuit && circuit.pricing_type === "per lap"
        ? `<option value="basic">Basic</option><option value="fuel_inc">Fuel-Inc</option><option value="all_inc">All-Inc</option>`
        : `<option value="basic">Basic</option><option value="fuel_inc">Fuel-Inc</option>`;

    const newCarDiv = document.createElement('div');
    newCarDiv.className = 'car-selection';
    newCarDiv.innerHTML = `
        <select id="car_${participantIndex}_${dayIndex}_${carCount}">
            <option value="">Select Car</option>
            ${allCars}
        </select>
        <select id="package_${participantIndex}_${dayIndex}_${carCount}">
            ${packageOptions}
        </select>
        <button class="remove-car-btn" onclick="this.parentElement.remove()">Remove</button>
    `;
    group.insertBefore(newCarDiv, group.querySelector('.add-car-btn'));
}

// Remove a participant (unchanged)
function removeParticipant(participantIndex) {
    const event = events[currentEventIndex];
    event.participants.splice(participantIndex, 1);
    updateParticipantsTable();
}

// Save all participant changes (unchanged)
function saveAllParticipants() {
    const event = events[currentEventIndex];

    event.participants.forEach((participant, participantIndex) => {
        const carsPerDay = [];
        const packagesPerDay = [];
        const drivenPerDay = participant.driven_per_day || Array(event.days.length).fill([]);

        event.days.forEach((day, dayIndex) => {
            const carSelections = document.querySelectorAll(`#participantsTableBody tr:nth-child(${participantIndex + 1}) td:nth-child(${dayIndex + 2}) .car-selection`);
            const dayCars = [];
            const dayPackages = [];

            carSelections.forEach((selection, carIdx) => {
                const car = document.getElementById(`car_${participantIndex}_${dayIndex}_${carIdx}`).value;
                const packageType = document.getElementById(`package_${participantIndex}_${dayIndex}_${carIdx}`).value;
                if (car && packageType) { // Only save if both are selected
                    dayCars.push(car);
                    dayPackages.push(packageType);
                    if (!event.cars_assigned[dayIndex]) event.cars_assigned[dayIndex] = {};
                    event.cars_assigned[dayIndex][car] = `${participant.client.name} ${participant.client.surname}`;
                }
            });

            carsPerDay.push(dayCars);
            packagesPerDay.push(dayPackages);
            drivenPerDay[dayIndex] = drivenPerDay[dayIndex].slice(0, dayCars.length);
        });

        participant.car_per_day = carsPerDay;
        participant.package_per_day = packagesPerDay;
        participant.driven_per_day = drivenPerDay;
    });

    event.participants = event.participants.filter(p => p.car_per_day.some(day => day.length > 0));
    saveData();
    updateParticipantsTable();
    alert('Participants saved successfully!');
}

function cancelEditEvent() {
    hideAllEditForms();
    document.getElementById('editEventForm').style.display = 'none';
    document.getElementById('eventsTable').style.display = 'table'; // Restore table visibility
    document.getElementById('eventsControls').style.display = 'block'; // Restore "Add Event" button
    showSection('events'); // Reset to events view
    currentEventIndex = null;
}

function deleteEvent(index = currentEventIndex) {
    if (confirm(`Are you sure you want to delete the event "${events[index].name}"?`)) {
        events.splice(index, 1);
        saveData();
        document.getElementById('editEventForm').style.display = 'none';
        currentEventIndex = null;
        updateEventsTable();
    }
}

function hideAllEditForms() {
    document.getElementById('editEventDetailsForm').style.display = 'none';
    document.getElementById('assignCircuitsForm').style.display = 'none';
    document.getElementById('assignCarsPricingForm').style.display = 'none';
    document.getElementById('participantsSection').style.display = 'none';
    document.getElementById('enterDrivenDataForm').style.display = 'none';
    document.getElementById('clientPackageForm').style.display = 'none';
    document.getElementById('processBalancesForm').style.display = 'none';
    document.getElementById('overviewForm').style.display = 'none';
}

function showEditEventDetailsForm() {
    hideAllEditForms();
    const event = events[currentEventIndex];
    document.getElementById('editEventNameInput').value = event.name;
    const daysInputs = document.getElementById('editEventDaysInputs');
    daysInputs.innerHTML = '';
    event.days.forEach((day, i) => {
        daysInputs.innerHTML += `
            <div>
                <h4>Day ${i + 1}</h4>
                <label>Date: <input type="date" id="editEventDay${i}" value="${day.date}"></label>
            </div>
        `;
    });
    document.getElementById('editEventDetailsForm').style.display = 'block';
}

function saveEventDetails() {
    const event = events[currentEventIndex];
    const newName = document.getElementById('editEventNameInput').value;
    if (!newName) {
        alert("Please enter a valid event name.");
        return;
    }

    const days = [];
    for (let i = 0; i < event.days.length; i++) {
        const dateInput = document.getElementById(`editEventDay${i}`).value;
        if (!dateInput) {
            alert(`Please select a date for Day ${i + 1}.`);
            return;
        }
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) {
            alert(`Invalid date selected for Day ${i + 1}.`);
            return;
        }
        days.push({ date: dateInput, circuit: event.days[i].circuit });
    }

    event.name = newName;
    event.days = days;

    saveData();
    document.getElementById('editEventDetailsForm').style.display = 'none';
    editEvent(currentEventIndex);
}

function assignCircuits() {
    hideAllEditForms();
    const event = events[currentEventIndex];
    const circuitAssignments = document.getElementById('circuitAssignments');
    circuitAssignments.innerHTML = '';
    event.days.forEach((day, i) => {
        circuitAssignments.innerHTML += `
            <div>
                <label>Day ${i + 1} (${day.date}): 
                    <select id="circuitDay${i}">
                        <option value="">Select Circuit</option>
                        ${circuits.map(c => `<option value="${c.name}" ${day.circuit && day.circuit.name === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                </label>
            </div>
        `;
    });
    document.getElementById('assignCircuitsForm').style.display = 'block';
}

function saveCircuits() {
    const event = events[currentEventIndex];
    for (let i = 0; i < event.days.length; i++) {
        const circuitName = document.getElementById(`circuitDay${i}`).value;
        if (!circuitName) {
            alert(`Please select a circuit for Day ${i + 1}`);
            return;
        }
        event.days[i].circuit = circuits.find(c => c.name === circuitName);
    }

    saveData();
    document.getElementById('assignCircuitsForm').style.display = 'none';
    editEvent(currentEventIndex);
}

function assignCarsPricing() {
    hideAllEditForms();
    const event = events[currentEventIndex];
    const availableCarsSelection = document.getElementById('availableCarsSelection');
    availableCarsSelection.innerHTML = `
        <h4>Select Available Cars by Model:</h4>
        <button class="select-all-btn" id="selectAllBtn" onclick="toggleSelectAll()">Select All</button>
    `;

    const carsByModel = {};
    cars.forEach(car => {
        const modelKey = `${car.brand} ${car.model}`;
        if (!carsByModel[modelKey]) {
            carsByModel[modelKey] = [];
        }
        carsByModel[modelKey].push(car);
    });

    for (const model in carsByModel) {
        const modelCars = carsByModel[model];
        const allSelected = modelCars.every(car => event.available_cars.includes(car.license_plate));
        availableCarsSelection.innerHTML += `
            <div class="model-group">
                <button class="model-btn ${allSelected ? 'selected' : ''}" id="modelBtn_${model.replace(/\s+/g, '_')}" onclick="toggleModelSelection('${model}')">
                    ${model} (${modelCars.length} cars)
                </button>
                <button class="expand-btn" onclick="toggleExpandModel('${model}')">Expand</button>
                <div class="plates-list" id="plates_${model.replace(/\s+/g, '_')}" style="display: none;">
                    ${modelCars.map(car => `
                        <button class="plate-btn ${event.available_cars.includes(car.license_plate) ? 'selected' : ''}" 
                                id="plateBtn_${car.license_plate}" 
                                onclick="togglePlateSelection('${car.license_plate}')">
                            ${car.license_plate}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    const pricingInputs = document.getElementById('carsPricingInputs');
    pricingInputs.innerHTML = `
        <h4>Pricing Options:</h4>
        <button class="modify-pricing-btn" onclick="togglePricingInputs()">Modify Pricing</button>
        <div id="pricingInputsContainer" style="display: none;">
            ${cars.map(car => `
                <div id="pricing_${car.license_plate}" style="display: ${event.available_cars.includes(car.license_plate) ? 'block' : 'none'};">
                    <h5>${car.brand} ${car.model} (${car.license_plate})</h5>
                    <label>Basic Price per Lap: <input type="number" id="basicPriceLap_${car.license_plate}" value="${event.pricing[`${car.license_plate}_basic_lap`] || ''}" step="0.01"></label><br>
                    <label>All-Inc Price per Lap: <input type="number" id="allIncPriceLap_${car.license_plate}" value="${event.pricing[`${car.license_plate}_all_inc_lap`] || ''}" step="0.01"></label><br>
                    <label>Basic Price per km: <input type="number" id="basicPriceKm_${car.license_plate}" value="${event.pricing[`${car.license_plate}_basic_km`] || ''}" step="0.01"></label><br>
                    <label>Fuel Cost per km: <input type="number" id="fuelCostKm_${car.license_plate}" value="${event.pricing[`${car.license_plate}_fuel_cost_km`] || ''}" step="0.01"></label><br>
                </div>
            `).join('')}
        </div>
    `;

    document.getElementById('assignCarsPricingForm').style.display = 'block';
    updateSelectAllButton();
}

function toggleSelectAll() {
    const selectAllBtn = document.getElementById('selectAllBtn');
    const isCurrentlySelected = selectAllBtn.classList.contains('selected');
    const newState = !isCurrentlySelected; // Toggle to the opposite state
    const modelButtons = document.getElementsByClassName('model-btn');

    // Toggle each model and its plates
    for (const modelBtn of modelButtons) {
        const model = modelBtn.id.replace('modelBtn_', '').replace(/_/g, ' ');
        const platesList = document.getElementById(`plates_${model.replace(/\s+/g, '_')}`).getElementsByClassName('plate-btn');

        // Set model button state
        modelBtn.classList.toggle('selected', newState);
        modelBtn.classList.remove('partial'); // Clear partial state

        // Set all plates for this model
        for (const plateBtn of platesList) {
            const licensePlate = plateBtn.id.replace('plateBtn_', '');
            plateBtn.classList.toggle('selected', newState);
            document.getElementById(`pricing_${licensePlate}`).style.display = newState ? 'block' : 'none';
        }
    }

    // Update Select All button state
    selectAllBtn.classList.toggle('selected', newState);
    selectAllBtn.textContent = newState ? 'Deselect All' : 'Select All';
}

function updateSelectAllButton() {
    const modelButtons = document.getElementsByClassName('model-btn');
    const allSelected = Array.from(modelButtons).every(btn => btn.classList.contains('selected'));
    const selectAllBtn = document.getElementById('selectAllBtn');
    
    selectAllBtn.classList.toggle('selected', allSelected);
    selectAllBtn.textContent = allSelected ? 'Deselect All' : 'Select All';
}

function togglePricingInputs() {
    const pricingContainer = document.getElementById('pricingInputsContainer');
    pricingContainer.style.display = pricingContainer.style.display === 'none' ? 'block' : 'none';
}

function toggleModelSelection(model) {
    const modelBtn = document.getElementById(`modelBtn_${model.replace(/\s+/g, '_')}`);
    const isSelected = modelBtn.classList.toggle('selected');
    const platesList = document.getElementById(`plates_${model.replace(/\s+/g, '_')}`).getElementsByClassName('plate-btn');

    for (const plateBtn of platesList) {
        const licensePlate = plateBtn.id.replace('plateBtn_', '');
        if (isSelected) {
            plateBtn.classList.add('selected');
            document.getElementById(`pricing_${licensePlate}`).style.display = 'block';
        } else {
            plateBtn.classList.remove('selected');
            document.getElementById(`pricing_${licensePlate}`).style.display = 'none';
        }
    }

    updateSelectAllButton();
}

function togglePlateSelection(licensePlate) {
    const plateBtn = document.getElementById(`plateBtn_${licensePlate}`);
    const isSelected = plateBtn.classList.toggle('selected');
    const pricingDiv = document.getElementById(`pricing_${licensePlate}`);
    pricingDiv.style.display = isSelected ? 'block' : 'none';

    const model = Array.from(cars).find(car => car.license_plate === licensePlate);
    const modelKey = `${model.brand} ${model.model}`;
    const modelBtn = document.getElementById(`modelBtn_${modelKey.replace(/\s+/g, '_')}`);
    const platesList = document.getElementById(`plates_${modelKey.replace(/\s+/g, '_')}`).getElementsByClassName('plate-btn');
    const allSelected = Array.from(platesList).every(btn => btn.classList.contains('selected'));
    const noneSelected = Array.from(platesList).every(btn => !btn.classList.contains('selected'));

    modelBtn.classList.toggle('selected', allSelected);
    modelBtn.classList.toggle('partial', !allSelected && !noneSelected);

    updateSelectAllButton();
}

function toggleExpandModel(model) {
    const platesList = document.getElementById(`plates_${model.replace(/\s+/g, '_')}`);
    platesList.style.display = platesList.style.display === 'none' ? 'block' : 'none';
}

/* function toggleCarSelection(licensePlate) {
    const button = document.getElementById(`carBtn_${licensePlate}`);
    const pricingDiv = document.getElementById(`pricing_${licensePlate}`);
    
    // Toggle the 'selected' class
    button.classList.toggle('selected');
    
    // Show or hide pricing inputs based on selection
    pricingDiv.style.display = button.classList.contains('selected') ? 'block' : 'none';
} */

function saveCarsPricing() {
    const event = events[currentEventIndex];
    const availableCars = [];
    event.pricing = {};

    cars.forEach(car => {
        const button = document.getElementById(`plateBtn_${car.license_plate}`);
        if (button && button.classList.contains('selected')) {
            availableCars.push(car.license_plate);
            const basicPriceLap = parseFloat(document.getElementById(`basicPriceLap_${car.license_plate}`).value);
            const allIncPriceLap = parseFloat(document.getElementById(`allIncPriceLap_${car.license_plate}`).value);
            const basicPriceKm = parseFloat(document.getElementById(`basicPriceKm_${car.license_plate}`).value);
            const fuelCostKm = parseFloat(document.getElementById(`fuelCostKm_${car.license_plate}`).value);

            if (!isNaN(basicPriceLap)) event.pricing[`${car.license_plate}_basic_lap`] = basicPriceLap;
            if (!isNaN(allIncPriceLap)) event.pricing[`${car.license_plate}_all_inc_lap`] = allIncPriceLap;
            if (!isNaN(basicPriceKm)) event.pricing[`${car.license_plate}_basic_km`] = basicPriceKm;
            if (!isNaN(fuelCostKm)) event.pricing[`${car.license_plate}_fuel_cost_km`] = fuelCostKm;
        }
    });

    event.available_cars = availableCars;
    saveData();
    document.getElementById('assignCarsPricingForm').style.display = 'none';
    editEvent(currentEventIndex);
}

function saveParticipant(clientIndex) {
    const event = events[currentEventIndex];
    const client = clients[clientIndex];
    if (!client) {
        console.error('Invalid client index:', clientIndex);
        alert('Error: Selected client not found');
        return;
    }

    const participant = {
        client: { name: client.name, surname: client.surname },
        car_per_day: [],
        package_per_day: [],
        driven_per_day: [],
        paid_per_day: new Array(event.days.length).fill(0), // Initialize for all days
        package_payment: {},
        payment_details: [],
        paid_status: false
    };

    for (let i = 0; i < event.days.length; i++) {
        const checkbox = document.getElementById(`clientDay_${clientIndex}_${i}`);
        if (checkbox && checkbox.checked) {
            const carsForDay = [];
            const packagesForDay = [];
            let carCount = 0;
            while (document.getElementById(`participantCar_${clientIndex}_${i}_${carCount}`)) {
                const carSelect = document.getElementById(`participantCar_${clientIndex}_${i}_${carCount}`);
                const packageSelect = document.getElementById(`participantPackage_${clientIndex}_${i}_${carCount}`);
                if (carSelect.value) {
                    carsForDay.push(carSelect.value);
                    packagesForDay.push(packageSelect.value);
                }
                carCount++;
            }
            participant.car_per_day[i] = carsForDay;
            participant.package_per_day[i] = packagesForDay;
            participant.driven_per_day[i] = new Array(carsForDay.length).fill(0);
            // paid_per_day[i] already initialized to 0
        } else {
            participant.car_per_day[i] = [];
            participant.package_per_day[i] = [];
            participant.driven_per_day[i] = [];
            // paid_per_day[i] already initialized to 0
        }
    }

    event.participants.push(participant);
    saveData();
    document.getElementById('addParticipantModal').remove();
    editEvent(currentEventIndex);
}

function enterDrivenData() {
    hideAllEditForms();
    const event = events[currentEventIndex];
    const daySelect = document.getElementById('drivenDay');
    daySelect.innerHTML = '<option value="">Select Day</option>' + event.days.map((_, i) => `<option value="${i}">Day ${i + 1}</option>`).join('');
    document.getElementById('enterDrivenDataForm').style.display = 'block';
    updateDrivenDataClients();
}

function updateDrivenDataClients() {
    const event = events[currentEventIndex];
    const dayIndex = parseInt(document.getElementById('drivenDay').value);
    const drivenInputs = document.getElementById('drivenDataInputs');
    drivenInputs.innerHTML = '';

    if (isNaN(dayIndex)) return;

    const participantsOnDay = event.participants.filter(p => p.car_per_day[dayIndex].length > 0);
    if (participantsOnDay.length === 0) {
        drivenInputs.innerHTML = '<p>No participants assigned to this day.</p>';
        return;
    }

    participantsOnDay.forEach((participant, pIndex) => {
        const circuit = event.days[dayIndex].circuit;
        const carsForDay = participant.car_per_day[dayIndex];
        drivenInputs.innerHTML += `
            <div>
                <h4>${participant.client.name} ${participant.client.surname}</h4>
                ${carsForDay.map((carPlate, carIdx) => {
                    const driven = participant.driven_per_day[dayIndex][carIdx] || 0;
                    return `
                        <label>${carPlate} (${circuit ? circuit.pricing_type === 'per lap' ? 'laps' : 'km' : 'N/A'}): 
                            <input type="number" id="drivenValue_${pIndex}_${carIdx}" value="${driven}" step="0.01">
                        </label><br>
                    `;
                }).join('')}
            </div>
        `;
    });
}

function saveDrivenData() {
    const event = events[currentEventIndex];
    const dayIndex = parseInt(document.getElementById('drivenDay').value);
    if (isNaN(dayIndex)) {
        alert("Please select a day.");
        return;
    }

    const participantsOnDay = event.participants.filter(p => p.car_per_day[dayIndex].length > 0);
    participantsOnDay.forEach((participant, pIndex) => {
        const carsForDay = participant.car_per_day[dayIndex];
        const drivenValues = carsForDay.map((_, carIdx) => 
            parseFloat(document.getElementById(`drivenValue_${pIndex}_${carIdx}`).value) || 0
        );

        // Ensure driven_per_day is an array of arrays; initialize if needed
        if (!Array.isArray(participant.driven_per_day[0])) {
            participant.driven_per_day = event.days.map(() => []);
        }
        participant.driven_per_day[dayIndex] = drivenValues;

        // Update highest mileage for each car
        carsForDay.forEach((carPlate, carIdx) => {
            const car = cars.find(c => c.license_plate === carPlate);
            const circuit = event.days[dayIndex].circuit;
            const driven = drivenValues[carIdx];
            if (circuit && circuit.pricing_type === 'per km') {
                car.highest_mileage = Math.max(car.highest_mileage, driven);
            } else if (circuit) {
                car.highest_mileage = Math.max(car.highest_mileage, driven * circuit.length);
            }
        });
    });

    saveData();
    document.getElementById('enterDrivenDataForm').style.display = 'none';
    updateCarsTable();
    enterDrivenData()
}

// Discount calculation
function getDiscount(driven, pricingType) {
    if (pricingType === "per lap") {
        if (driven <= 3) return 0;
        else if (driven === 4) return 0.05;
        else if (driven === 5) return 0.075;
        else if (driven === 6) return 0.10;
        else if (driven === 7) return 0.125;
        else if (driven === 8) return 0.15;
        else if (driven === 9) return 0.20;
        else if (driven === 10) return 0.25;
        else if (driven === 11) return 0.275;
        else if (driven === 12) return 0.30;
        else if (driven === 13) return 0.31;
        else if (driven === 14) return 0.32;
        else if (driven === 15) return 0.33;
        else if (driven === 16) return 0.35;
        else if (driven === 17) return 0.36;
        else if (driven === 18) return 0.37;
        else if (driven === 19) return 0.38;
        else return 0.40; // 20+ laps
    } else {
        if (driven < 170) return 0;
        else if (driven < 200) return 0.10;
        else if (driven < 250) return 0.20;
        else if (driven < 300) return 0.25;
        else if (driven < 400) return 0.30;
        else return 0.40; // 400+ km
    }
}

function clientPackage() {
    hideAllEditForms();
    const event = events[currentEventIndex];
    const header = document.getElementById('clientPackageTableHeader');
    const tbody = document.getElementById('clientPackageTableBody');

    const uniqueCircuits = [...new Set(event.days.map(day => day.circuit ? day.circuit.name : null))].filter(c => c);
    let headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>Client</th>';
    uniqueCircuits.forEach(circuit => {
        headerRow.innerHTML += `<th>${circuit} Paid</th>`;
    });
    headerRow.innerHTML += '<th>Actions</th>';
    header.innerHTML = '';
    header.appendChild(headerRow);

    tbody.innerHTML = '';
    event.participants.forEach((participant, participantIndex) => {
        const row = document.createElement('tr');
        let rowHTML = `<td>${participant.client.name} ${participant.client.surname}</td>`;
        uniqueCircuits.forEach(circuit => {
            const packagePaid = participant.package_payment && participant.package_payment[circuit] || 0;
            rowHTML += `
                <td>
                    <input type="number" id="paid_${participantIndex}_${circuit}" value="${packagePaid.toFixed(2)}" step="0.01">
                </td>
            `;
        });
        rowHTML += `<td><button onclick="viewAndEditPayments(${participantIndex})">All Payments</button></td>`;
        row.innerHTML = rowHTML;
        tbody.appendChild(row);
    });

    document.getElementById('clientPackageForm').style.display = 'block';
}

function saveClientPackage() {
    const event = events[currentEventIndex];
    const uniqueCircuits = [...new Set(event.days.map(day => day.circuit ? day.circuit.name : null))].filter(c => c);

    event.participants.forEach((participant, participantIndex) => {
        participant.package_payment = participant.package_payment || {};
        uniqueCircuits.forEach(circuit => {
            const paidInput = document.getElementById(`paid_${participantIndex}_${circuit}`);
            const packagePaid = parseFloat(paidInput.value) || 0;
            participant.package_payment[circuit] = packagePaid;
            // Reset paid_per_day to reflect only package payments
            participant.paid_per_day = participant.paid_per_day.map((_, dayIndex) => 
                event.days[dayIndex].circuit && participant.package_payment[event.days[dayIndex].circuit.name] 
                    ? participant.package_payment[event.days[dayIndex].circuit.name] / event.days.filter(d => d.circuit && d.circuit.name === event.days[dayIndex].circuit.name).length 
                    : 0
            );
        });
    });

    saveData();
    document.getElementById('clientPackageForm').style.display = 'none';
    editEvent(currentEventIndex);
}

function calculateCircuitCredit(participant, event, trackDayIndices, circuit) {
    if (!circuit) return 0;

    const usageGroups = {};
    trackDayIndices.forEach(dayIndex => {
        participant.car_per_day[dayIndex].forEach((carPlate, carIdx) => {
            if (carPlate) {
                const car = cars.find(c => c.license_plate === carPlate);
                const modelKey = `${car.brand} ${car.model}`;
                const packageType = participant.package_per_day[dayIndex][carIdx] || 'basic';
                const key = `${modelKey}_${packageType}_${circuit.name}`;
                if (!usageGroups[key]) {
                    usageGroups[key] = { driven: 0, pricing: car, package: packageType };
                }
                usageGroups[key].driven += participant.driven_per_day[dayIndex][carIdx] || 0;
            }
        });
    });

    let totalCost = 0;
    for (const key in usageGroups) {
        const group = usageGroups[key];
        const driven = group.driven;
        let carCost = 0;

        if (circuit.pricing_type === "per lap") {
            const basicCostPerLap = event.pricing[`${group.pricing.license_plate}_basic_lap`] || group.pricing.basic_price_lap;
            const allIncCostPerLap = event.pricing[`${group.pricing.license_plate}_all_inc_lap`] || group.pricing.all_inc_price_lap;
            const discount = getDiscount(driven, "per lap");
            const discountedBasicCost = basicCostPerLap * (1 - discount);
            carCost = driven * discountedBasicCost;
            if (group.package === "fuel_inc") carCost += driven * (allIncCostPerLap - 35);
            else if (group.package === "all_inc") carCost += driven * allIncCostPerLap;
        } else {
            const basicCostPerKm = event.pricing[`${group.pricing.license_plate}_basic_km`] || group.pricing.basic_price_km;
            const fuelCostPerKm = event.pricing[`${group.pricing.license_plate}_fuel_cost_km`] || group.pricing.fuel_cost_km;
            const discount = getDiscount(driven, "per km");
            const discountedBasicCost = basicCostPerKm * (1 - discount);
            carCost = driven * discountedBasicCost;
            if (group.package === "fuel_inc" || group.package === "all_inc") {
                let baseFuelCost = circuit.name === "Spa" || circuit.name === "Nürburgring GP Track"
                    ? Math.round(fuelCostPerKm * 10) / 10
                    : Math.round((fuelCostPerKm * 1.3) * 10) / 10;
                carCost += driven * baseFuelCost;
            }
        }
        totalCost += carCost;
    }

    return totalCost;
}

function viewEvent(index) {
    hideAllEditForms();
    currentEventIndex = index;
    const event = events[currentEventIndex];
    const header = document.getElementById('overviewTableHeader');
    const tbody = document.getElementById('overviewTableBody');

    const circuitGroups = {};
    event.days.forEach((day, dayIndex) => {
        const circuitName = day.circuit ? day.circuit.name : 'N/A';
        if (!circuitGroups[circuitName]) {
            circuitGroups[circuitName] = { days: [], pricingType: day.circuit ? day.circuit.pricing_type : 'N/A' };
        }
        circuitGroups[circuitName].days.push({ index: dayIndex, date: day.date });
    });

    const circuitColors = {
        'N/A': '#A9A9A9',
        'Spa': '#87CEEB',
        'Nürburgring GP Track': '#98FB98',
        'Nurburgring Nordschleife': '#FF9999',
    };

    let headerRows = [[], []];
    headerRows[0].push({ content: 'Customer', colSpan: 1, rowSpan: 2 });

    let currentColIndex = 1; // Track column position for borders
    Object.entries(circuitGroups).forEach(([circuitName, group], idx) => {
        const dayCount = group.days.length;
        const hasMultipleDays = dayCount > 1;
        const baseCols = 1 + dayCount;
        const usageCols = hasMultipleDays ? dayCount + 1 : 1;
        const summaryCols = 2;
        const totalCircuitCols = baseCols + usageCols + summaryCols;

        const headerColor = circuitColors[circuitName] || `hsl(${idx * 60}, 50%, 80%)`;
        // Top header with border-right for separation
        headerRows[0].push({ 
            content: circuitName, 
            colSpan: totalCircuitCols, 
            styles: { 
                halign: 'center', 
                backgroundColor: headerColor,
                borderRight: idx < Object.keys(circuitGroups).length - 1 ? '2px solid #000' : 'none' // Line between circuits
            } 
        });

        // Subheaders with the same color
        headerRows[1].push({ content: 'Paid Track', styles: { halign: 'center', backgroundColor: headerColor } });
        group.days.forEach(day => {
            headerRows[1].push({ content: `Car Used (${day.date})`, styles: { halign: 'center', backgroundColor: headerColor } });
            if (hasMultipleDays) {
                headerRows[1].push({ 
                    content: `${group.pricingType === 'per lap' ? 'Laps' : 'Km'} (${day.date})`, 
                    styles: { halign: 'center', backgroundColor: headerColor } 
                });
            }
        });
        headerRows[1].push({ content: `Total ${group.pricingType === 'per lap' ? 'Laps' : 'Km'}`, styles: { halign: 'center', backgroundColor: headerColor } });
        headerRows[1].push({ content: 'Credit Used', styles: { halign: 'center', backgroundColor: headerColor } });
        headerRows[1].push({ content: 'Balance Track', styles: { halign: 'center', backgroundColor: headerColor } });

        currentColIndex += totalCircuitCols;
    });

    // Summary header with a left border to separate from circuits
    headerRows[0].push({ 
        content: 'Summary', 
        colSpan: 4, 
        styles: { 
            halign: 'center', 
            backgroundColor: '#D3D3D3', 
            borderLeft: '2px solid #000' // Line before Summary
        } 
    });
    headerRows[1].push({ content: 'Total Paid', styles: { backgroundColor: '#D3D3D3' } });
    headerRows[1].push({ content: 'Total Used', styles: { backgroundColor: '#D3D3D3' } });
    headerRows[1].push({ content: 'Final Balance', styles: { backgroundColor: '#D3D3D3' } });
    headerRows[1].push({ content: 'Balance Paid', styles: { backgroundColor: '#D3D3D3' } });

    header.innerHTML = '';
    headerRows.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
            const th = document.createElement('th');
            th.textContent = typeof cell === 'string' ? cell : cell.content;
            if (cell.colSpan) th.colSpan = cell.colSpan;
            if (cell.rowSpan) th.rowSpan = cell.rowSpan;
            if (cell.styles) {
                if (cell.styles.halign) th.style.textAlign = cell.styles.halign;
                if (cell.styles.backgroundColor) th.style.backgroundColor = cell.styles.backgroundColor;
                if (cell.styles.borderRight) th.style.borderRight = cell.styles.borderRight;
                if (cell.styles.borderLeft) th.style.borderLeft = cell.styles.borderLeft;
            }
            tr.appendChild(th);
        });
        header.appendChild(tr);
    });

    // Rest of the function (tbody) remains unchanged
    tbody.innerHTML = '';
    event.participants.forEach(participant => {
        const row = document.createElement('tr');
        let rowHTML = `<td>${participant.client.name} ${participant.client.surname}</td>`;
        let totalPaid = 0;
        let totalCreditUsed = 0;

        Object.entries(circuitGroups).forEach(([circuitName, group]) => {
            const trackDayIndices = group.days.map(d => d.index);
            const circuit = event.days[trackDayIndices[0]].circuit;
            const paidTrack = trackDayIndices.reduce((sum, idx) => sum + (participant.paid_per_day[idx] || 0), 0);
            totalPaid += paidTrack;

            const circuitCreditUsed = calculateCircuitCredit(participant, event, trackDayIndices, circuit);
            totalCreditUsed += circuitCreditUsed;

            rowHTML += `<td>€${Math.round(paidTrack)}</td>`;
            group.days.forEach(day => {
                const carsForDay = participant.car_per_day[day.index].map(plate => {
                    const car = cars.find(c => c.license_plate === plate);
                    return car ? `${car.model} (${plate})` : plate;
                }).join(', ');
                rowHTML += `<td>${carsForDay || 'N/A'}</td>`;
                if (group.days.length > 1) {
                    const drivenWithPackage = participant.driven_per_day[day.index].map((driven, i) => {
                        const pkg = participant.package_per_day[day.index][i] || 'basic';
                        return `${driven || 0} (${pkg})`;
                    }).join(', ');
                    rowHTML += `<td>${drivenWithPackage || '0'}</td>`;
                }
            });

            const totalDrivenString = Object.entries(
                trackDayIndices.reduce((acc, dayIdx) => {
                    participant.car_per_day[dayIdx].forEach((carPlate, carIdx) => {
                        if (carPlate) {
                            const car = cars.find(c => c.license_plate === carPlate);
                            const modelKey = `${car.brand} ${car.model}`;
                            const packageType = participant.package_per_day[dayIdx][carIdx] || 'basic';
                            acc[`${modelKey}_${packageType}`] = 
                                (acc[`${modelKey}_${packageType}`] || 0) + 
                                (participant.driven_per_day[dayIdx][carIdx] || 0);
                        }
                    });
                    return acc;
                }, {})
            ).map(([key, driven]) => `${driven} (${key.split('_')[1]})`).join(', ');
            rowHTML += `<td>${totalDrivenString || '0'}</td>`;
            
            rowHTML += `<td>€${Math.round(circuitCreditUsed)}</td>`;
            const balanceTrack = Math.round(paidTrack - circuitCreditUsed);
            rowHTML += `<td style="background-color: ${balanceTrack < 0 ? '#FF9999' : 'inherit'}">€${balanceTrack}</td>`;
        });

        const finalBalance = Math.round(totalPaid - totalCreditUsed);
        rowHTML += `
            <td>€${Math.round(totalPaid)}</td>
            <td>€${Math.round(totalCreditUsed)}</td>
            <td style="background-color: ${finalBalance < 0 ? '#FF9999' : 'inherit'}">€${finalBalance}</td>
            <td>${participant.paid_status ? 'Yes' : 'No'}</td>
        `;

        row.innerHTML = rowHTML;
        tbody.appendChild(row);
    });

    document.getElementById('overviewForm').style.display = 'block';
}

function generateEventOverviewPDF() {
    const event = events[currentEventIndex];
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(16);
    doc.text(`Event Overview - ${event.name}`, 14, 20);

    const circuitGroups = {};
    event.days.forEach((day, dayIndex) => {
        const circuitName = day.circuit ? day.circuit.name : 'N/A';
        if (!circuitGroups[circuitName]) {
            circuitGroups[circuitName] = { days: [], pricingType: day.circuit ? day.circuit.pricing_type : 'N/A' };
        }
        circuitGroups[circuitName].days.push({ index: dayIndex, date: day.date });
    });

    const circuitColors = {
        'N/A': [169, 169, 169],
        'Spa': [135, 206, 235],
        'Nürburgring GP Track': [152, 251, 152],
        'Nurburgring Nordschleife': [255, 153, 153]
    };

    let headers = [[], []];
    headers[0].push({ content: 'Customer', colSpan: 1, rowSpan: 2 });

    Object.entries(circuitGroups).forEach(([circuitName, group], idx) => {
        const dayCount = group.days.length;
        const hasMultipleDays = dayCount > 1;
        const totalCircuitCols = 1 + dayCount + (hasMultipleDays ? dayCount + 1 : 1) + 2;
        headers[0].push({ content: circuitName, colSpan: totalCircuitCols });
        headers[1].push('Paid Track');
        group.days.forEach(day => {
            const formattedDate = new Date(day.date).toLocaleString('en-US', { month: 'short', day: 'numeric' });
            headers[1].push(`Car Used (${formattedDate})`);
            if (hasMultipleDays) headers[1].push(`${group.pricingType === 'per lap' ? 'Laps' : 'Km'} (${formattedDate})`);
        });
        headers[1].push(`Total ${group.pricingType === 'per lap' ? 'Laps' : 'Km'}`);
        headers[1].push('Credit Used');
        headers[1].push('Balance Track');
    });

    headers[0].push({ content: 'Summary', colSpan: 4 });
    headers[1].push('Total Paid');
    headers[1].push('Total Used');
    headers[1].push('Final Balance');
    headers[1].push('Balance Paid');

    let body = [];
    let columnStyles = { 0: { cellWidth: 30 } };
    event.participants.forEach(participant => {
        let row = [`${participant.client.name} ${participant.client.surname}`];
        let totalPaid = 0;
        let totalCreditUsed = 0;
        let colIndex = 1;

        Object.entries(circuitGroups).forEach(([circuitName, group]) => {
            const trackDayIndices = group.days.map(d => d.index);
            const circuit = event.days[trackDayIndices[0]].circuit;
            const paidTrack = trackDayIndices.reduce((sum, idx) => sum + (participant.paid_per_day[idx] || 0), 0);
            totalPaid += paidTrack;
            const circuitCreditUsed = calculateCircuitCredit(participant, event, trackDayIndices, circuit);
            totalCreditUsed += circuitCreditUsed;

            row.push(`€${Math.round(paidTrack)}`);
            colIndex++;
            group.days.forEach(day => {
                const carsForDay = participant.car_per_day[day.index].map(plate => {
                    const car = cars.find(c => c.license_plate === plate);
                    return car ? `${car.model} (${plate})` : plate;
                }).join(', ');
                row.push(carsForDay || 'N/A');
                colIndex++;
                if (group.days.length > 1) {
                    const drivenWithPackage = participant.driven_per_day[day.index].map((driven, i) => {
                        const pkg = participant.package_per_day[day.index][i] || 'basic';
                        return `${driven || 0} (${pkg})`;
                    }).join(', ');
                    row.push(drivenWithPackage || '0');
                    colIndex++;
                }
            });

            const totalDrivenString = Object.entries(
                trackDayIndices.reduce((acc, dayIdx) => {
                    participant.car_per_day[dayIdx].forEach((carPlate, carIdx) => {
                        if (carPlate) {
                            const car = cars.find(c => c.license_plate === carPlate);
                            const modelKey = `${car.brand} ${car.model}`;
                            const packageType = participant.package_per_day[dayIdx][carIdx] || 'basic';
                            acc[`${modelKey}_${packageType}`] = 
                                (acc[`${modelKey}_${packageType}`] || 0) + 
                                (participant.driven_per_day[dayIdx][carIdx] || 0);
                        }
                    });
                    return acc;
                }, {})
            ).map(([key, driven]) => `${driven} (${key.split('_')[1]})`).join(', ');
            row.push(totalDrivenString || '0');
            colIndex++;

            row.push(`€${Math.round(circuitCreditUsed)}`);
            colIndex++;
            const balanceTrack = Math.round(paidTrack - circuitCreditUsed);
            row.push(`€${balanceTrack}`);
            if (balanceTrack < 0) columnStyles[colIndex] = { fillColor: [255, 153, 153] };
            colIndex++;
        });

        row.push(`€${Math.round(totalPaid)}`);
        colIndex++;
        row.push(`€${Math.round(totalCreditUsed)}`);
        colIndex++;
        const finalBalance = Math.round(totalPaid - totalCreditUsed);
        row.push(`€${finalBalance}`);
        if (finalBalance < 0) columnStyles[colIndex] = { fillColor: [255, 153, 153] };
        colIndex++;
        row.push(participant.paid_status ? 'Yes' : 'No');
        colIndex++;

        body.push(row);
    });

    doc.autoTable({
        startY: 30,
        head: headers,
        body: body,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [26, 42, 68] }, // Default, overridden by didParseCell
        didParseCell: function(data) {
            if (data.section === 'head') {
                const circuitIndex = Object.keys(circuitGroups).findIndex(name => 
                    data.row.index === 0 && data.cell.text[0] === name
                );
                if (circuitIndex >= 0) {
                    const circuitName = Object.keys(circuitGroups)[circuitIndex];
                    data.cell.styles.fillColor = circuitColors[circuitName] || [Math.min(200, 150 + circuitIndex * 20), 200, 200];
                } else if (data.row.index === 0 && data.cell.text[0] === 'Summary') {
                    data.cell.styles.fillColor = [211, 211, 211];
                } else if (data.row.index === 1) {
                    // Apply color to subheaders based on their position
                    let colIdx = 1; // Start after Customer column
                    Object.entries(circuitGroups).forEach(([circuitName], idx) => {
                        const totalCols = headers[0][idx + 1].colSpan; // +1 to skip Customer
                        if (data.column.index >= colIdx && data.column.index < colIdx + totalCols) {
                            data.cell.styles.fillColor = circuitColors[circuitName] || [Math.min(200, 150 + idx * 20), 200, 200];
                        }
                        colIdx += totalCols;
                    });
                    if (data.column.index >= colIdx) {
                        data.cell.styles.fillColor = [211, 211, 211]; // Summary subheaders
                    }
                }
            }
        },
        didDrawCell: function(data) {
            if (data.section === 'head' && data.row.index === 0) {
                const circuitIndex = Object.keys(circuitGroups).findIndex(name => data.cell.text[0] === name);
                if (circuitIndex >= 0 && circuitIndex < Object.keys(circuitGroups).length - 1) {
                    // Draw vertical line between circuits
                    const x = data.cell.x + data.cell.width;
                    doc.setDrawColor(0); // Black
                    doc.setLineWidth(0.5);
                    doc.line(x, data.cell.y, x, data.cell.y + data.cell.height * 2); // Span both header rows
                } else if (data.cell.text[0] === 'Summary') {
                    // Draw line before Summary
                    const x = data.cell.x;
                    doc.setDrawColor(0);
                    doc.setLineWidth(0.5);
                    doc.line(x, data.cell.y, x, data.cell.y + data.cell.height * 2);
                }
            }
        },
        columnStyles: columnStyles,
        margin: { top: 25, left: 5, right: 5, bottom: 10 }
    });

    doc.save(`Event_Overview_${event.name}.pdf`);
}

function processBalances() {
    hideAllEditForms();
    const event = events[currentEventIndex];
    const header = document.getElementById('balancesTableHeader');
    const tbody = document.getElementById('balancesTableBody');

    const uniqueCircuits = [...new Set(event.days.map(day => day.circuit ? day.circuit.name : 'N/A'))].filter(c => c !== 'N/A');
    const hasMultipleCircuits = uniqueCircuits.length > 1;

    const circuitColors = {
        'N/A': '#A9A9A9',
        'Nurburgring Nordschleife': '#FF9999', 
        'Spa': '#87CEEB',
        'Nürburgring GP Track': '#98FB98'
    };

    let headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>Client</th>';
    if (hasMultipleCircuits) {
        uniqueCircuits.forEach((circuit, idx) => {
            const color = circuitColors[circuit] || `hsl(${idx * 60}, 50%, 80%)`;
            const borderStyle = idx < uniqueCircuits.length - 1 ? 'border-right: 2px solid #000;' : '';
            headerRow.innerHTML += `
                <th style="background-color: ${color}; ${borderStyle}">Credit Used on ${circuit}</th>
                <th style="background-color: ${color}; ${borderStyle}">Paid ${circuit}</th>
                <th style="background-color: ${color}; ${borderStyle}">Balance ${circuit}</th>
            `;
        });
    }
    headerRow.innerHTML += `
        <th style="border-left: 2px solid #000;">Total Credit Used</th>
        <th>Total Paid</th>
        <th>Total Balance</th>
        <th>Payment Amount</th>
        <th>Circuit</th>
        <th>Method</th>
        <th>Date</th>
        <th>Observation</th>
        <th>Actions</th>
    `;
    header.innerHTML = '';
    header.appendChild(headerRow);

    tbody.innerHTML = '';
    event.participants.forEach((participant, index) => {
        let totalCreditUsed = 0;
        let totalPaid = 0;
        const creditByCircuit = {};
        const paidByCircuit = {};

        if (!participant.paid_per_day || participant.paid_per_day.length !== event.days.length) {
            participant.paid_per_day = new Array(event.days.length).fill(0);
            saveData();
        }

        uniqueCircuits.forEach(circuitName => {
            const trackDayIndices = event.days
                .map((d, idx) => d.circuit && d.circuit.name === circuitName ? idx : -1)
                .filter(idx => idx !== -1);
            const circuit = event.days[trackDayIndices[0]]?.circuit;
            creditByCircuit[circuitName] = calculateCircuitCredit(participant, event, trackDayIndices, circuit);
            paidByCircuit[circuitName] = trackDayIndices.reduce((sum, idx) => sum + (participant.paid_per_day[idx] || 0), 0);
            totalCreditUsed += creditByCircuit[circuitName];
            totalPaid += paidByCircuit[circuitName];
        });

        const row = document.createElement('tr');
        let rowHTML = `<td>${participant.client.name} ${participant.client.surname}</td>`;
        if (hasMultipleCircuits) {
            uniqueCircuits.forEach(circuit => {
                const credit = creditByCircuit[circuit] || 0;
                const paid = paidByCircuit[circuit] || 0;
                const balance = Math.round(paid - credit);
                rowHTML += `
                    <td>€${Math.round(credit)}</td>
                    <td>€${Math.round(paid)}</td>
                    <td style="background-color: ${balance < 0 ? '#FF9999' : 'inherit'}">€${balance}</td>
                `;
            });
        }
        const totalBalance = Math.round(totalPaid - totalCreditUsed);
        rowHTML += `
            <td>€${Math.round(totalCreditUsed)}</td>
            <td>€${Math.round(totalPaid)}</td>
            <td style="background-color: ${totalBalance < 0 ? '#FF9999' : 'inherit'}">€${totalBalance}</td>
            <td><input type="number" id="payment_${index}" step="0.01" value="0"></td>
            <td>
                <select id="paymentCircuit_${index}">
                    ${hasMultipleCircuits 
                        ? `<option value="All">All</option>${uniqueCircuits.map(c => `<option value="${c}">${c}</option>`).join('')}`
                        : `<option value="${uniqueCircuits[0]}" selected>${uniqueCircuits[0]}</option>`}
                </select>
            </td>
            <td>
                <select id="paymentMethod_${index}">
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="OBS">OBS</option>
                </select>
            </td>
            <td><input type="date" id="paymentDate_${index}"></td>
            <td><input type="text" id="paymentObservation_${index}" placeholder="Optional observation"></td>
            <td><button onclick="viewAndEditPayments(${index})">View Payments</button></td>
        `;
        row.innerHTML = rowHTML;
        tbody.appendChild(row);
    });

    document.getElementById('processBalancesForm').style.display = 'block';
}

function saveBalances() {
    const event = events[currentEventIndex];
    const uniqueCircuits = [...new Set(event.days.map(day => day.circuit ? day.circuit.name : null))].filter(c => c);

    event.participants.forEach((participant, index) => {
        const payment = parseFloat(document.getElementById(`payment_${index}`).value) || 0;
        const paymentCircuit = document.getElementById(`paymentCircuit_${index}`).value;
        const paymentMethod = document.getElementById(`paymentMethod_${index}`).value;
        const paymentDate = document.getElementById(`paymentDate_${index}`).value;
        const paymentObservation = document.getElementById(`paymentObservation_${index}`).value;

        if (payment > 0) {
            let affectedDays;
            if (paymentCircuit === 'All') {
                affectedDays = participant.car_per_day.map((dayCars, idx) => dayCars.length > 0 ? idx : -1).filter(idx => idx !== -1);
            } else {
                affectedDays = event.days.map((day, idx) => day.circuit && day.circuit.name === paymentCircuit && participant.car_per_day[idx].length > 0 ? idx : -1).filter(idx => idx !== -1);
            }
            const paymentPerDay = affectedDays.length > 0 ? payment / affectedDays.length : 0;
            participant.paid_per_day = participant.paid_per_day.map(( contentiousIssue, dayIndex) => 
                affectedDays.includes(dayIndex) ? contentiousIssue + paymentPerDay : contentiousIssue
            );

            let totalCreditUsed = 0;
            const trackGroups = {};
            event.days.forEach((day, dayIndex) => {
                const track = day.circuit ? day.circuit.name : 'N/A';
                if (!trackGroups[track]) trackGroups[track] = [];
                trackGroups[track].push(dayIndex);
            });

            event.days.forEach((day, dayIndex) => {
                const circuit = day.circuit;
                let dayCost = 0;
                if (circuit) {
                    const trackDayIndices = trackGroups[circuit.name];
                    const modelGroups = {};
                    trackDayIndices.forEach(dIdx => {
                        participant.car_per_day[dIdx].forEach((carPlate, carIdx) => {
                            if (carPlate) {
                                const car = cars.find(c => c.license_plate === carPlate);
                                const modelKey = `${car.brand} ${car.model}`;
                                if (!modelGroups[modelKey]) {
                                    modelGroups[modelKey] = { driven: 0, package: participant.package_per_day[dIdx][carIdx], pricing: car };
                                }
                                modelGroups[modelKey].driven += participant.driven_per_day[dIdx][carIdx] || 0;
                            }
                        });
                    });

                    const dailyModelGroups = {};
                    participant.car_per_day[dayIndex].forEach((carPlate, carIdx) => {
                        if (carPlate) {
                            const car = cars.find(c => c.license_plate === carPlate);
                            const modelKey = `${car.brand} ${car.model}`;
                            if (!dailyModelGroups[modelKey]) {
                                dailyModelGroups[modelKey] = { driven: modelGroups[modelKey].driven, package: participant.package_per_day[dayIndex][carIdx], pricing: car };
                            }
                        }
                    });

                    for (const model in dailyModelGroups) {
                        const group = dailyModelGroups[model];
                        const driven = group.driven;
                        const packageType = group.package;
                        let carCost = 0;

                        if (circuit.pricing_type === "per lap") {
                            const basicCostPerLap = event.pricing[`${group.pricing.license_plate}_basic_lap`] || group.pricing.basic_price_lap;
                            const allIncCostPerLap = event.pricing[`${group.pricing.license_plate}_all_inc_lap`] || group.pricing.all_inc_price_lap;
                            const discount = getDiscount(driven, "per lap");
                            const discountedBasicCost = basicCostPerLap * (1 - discount);
                            carCost = driven * discountedBasicCost;
                            if (packageType === "all_inc") {
                                carCost += driven * allIncCostPerLap;
                            }
                        } else {
                            const basicCostPerKm = event.pricing[`${group.pricing.license_plate}_basic_km`] || group.pricing.basic_price_km;
                            const fuelCostPerKm = event.pricing[`${group.pricing.license_plate}_fuel_cost_km`] || group.pricing.fuel_cost_km;
                            const discount = getDiscount(driven, "per km");
                            const discountedBasicCost = basicCostPerKm * (1 - discount);
                            carCost = driven * discountedBasicCost;
                            if (packageType === "all_inc") {
                                let baseFuelCost = circuit.name === "Spa" || circuit.name === "Nürburgring GP Track" 
                                    ? Math.round(fuelCostPerKm * 10) / 10 
                                    : Math.round((fuelCostPerKm * 1.3) * 10) / 10;
                                carCost += driven * baseFuelCost;
                            }
                        }
                        dayCost += carCost / trackDayIndices.length;
                    }
                }
                totalCreditUsed += dayCost;
            });

            const totalPaid = participant.paid_per_day.reduce((sum, paid) => sum + paid, 0);
            participant.paid_status = totalPaid >= totalCreditUsed;

            participant.payment_details = participant.payment_details || [];
            participant.payment_details.push({ 
                amount: payment, 
                circuit: paymentCircuit,
                method: paymentMethod, 
                date: paymentDate || new Date().toISOString().split('T')[0], 
                observation: paymentObservation || null 
            });
        }
    });

    saveData();
    document.getElementById('processBalancesForm').style.display = 'none';
    viewEvent(currentEventIndex);
}

function viewAndEditPayments(participantIndex) {
    const event = events[currentEventIndex];
    const participant = event.participants[participantIndex];
    const uniqueCircuits = [...new Set(event.days.map(day => day.circuit ? day.circuit.name : null))].filter(c => c);

    let paymentHTML = `<h3>Payments for ${participant.client.name} ${participant.client.surname}</h3>`;
    paymentHTML += '<table><thead><tr><th>Type</th><th>Amount</th><th>Circuit</th><th>Method</th><th>Date</th><th>Observation</th><th>Actions</th></tr></thead><tbody>';

    uniqueCircuits.forEach(circuit => {
        const clientPackagePaid = participant.package_payment && participant.package_payment[circuit] || 0;
        if (clientPackagePaid > 0) {
            paymentHTML += `
                <tr>
                    <td>Package Payment</td>
                    <td>€${Math.round(clientPackagePaid)}</td> <!-- Non-editable -->
                    <td>${circuit}</td>
                    <td>N/A</td>
                    <td>N/A</td>
                    <td>Initial package payment</td>
                    <td></td> <!-- No actions for package payment -->
                </tr>
            `;
        }
    });

    if (participant.payment_details) {
        participant.payment_details.forEach((payment, paymentIdx) => {
            paymentHTML += `
                <tr>
                    <td>Extra Payment</td>
                    <td><input type="number" value="${Math.round(payment.amount)}" id="extraAmount_${paymentIdx}" step="0.01"></td>
                    <td>
                        <select id="extraCircuit_${paymentIdx}">
                            <option value="All" ${payment.circuit === 'All' ? 'selected' : ''}>All</option>
                            ${uniqueCircuits.map(c => `<option value="${c}" ${payment.circuit === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </td>
                    <td>
                        <select id="extraMethod_${paymentIdx}">
                            <option value="Cash" ${payment.method === 'Cash' ? 'selected' : ''}>Cash</option>
                            <option value="Credit Card" ${payment.method === 'Credit Card' ? 'selected' : ''}>Credit Card</option>
                            <option value="Bank Transfer" ${payment.method === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
                            <option value="OBS" ${payment.method === 'OBS' ? 'selected' : ''}>OBS</option>
                        </select>
                    </td>
                    <td><input type="date" value="${payment.date}" id="extraDate_${paymentIdx}"></td>
                    <td><input type="text" value="${payment.observation || ''}" id="extraObservation_${paymentIdx}"></td>
                    <td>
                        <button onclick="savePaymentEdit(${participantIndex}, 'extra', ${paymentIdx})">Save</button>
                        <button onclick="deletePayment(${participantIndex}, ${paymentIdx})">Delete</button>
                    </td>
                </tr>
            `;
        });
    }

    paymentHTML += '</tbody></table>';
    paymentHTML += '<button onclick="document.getElementById(\'viewPaymentsForm\').style.display = \'none\';">Close</button>';

    let viewPaymentsForm = document.getElementById('viewPaymentsForm');
    if (!viewPaymentsForm) {
        viewPaymentsForm = document.createElement('div');
        viewPaymentsForm.id = 'viewPaymentsForm';
        viewPaymentsForm.className = 'section';
        viewPaymentsForm.style.display = 'none';
        document.body.appendChild(viewPaymentsForm);
    }
    viewPaymentsForm.innerHTML = paymentHTML;
    viewPaymentsForm.style.display = 'block';
}

function savePaymentEdit(participantIndex, type, identifier) {
    const event = events[currentEventIndex];
    const participant = event.participants[participantIndex];
    const uniqueCircuits = [...new Set(event.days.map(day => day.circuit ? day.circuit.name : null))].filter(c => c);

    if (type === 'package') {
        const circuit = identifier;
        const newPaid = parseFloat(document.getElementById(`packagePaid_${circuit}`).value) || 0;
        const daysForCircuit = event.days.filter(day => day.circuit && day.circuit.name === circuit).length;
        const paidPerDay = daysForCircuit > 0 ? newPaid / daysForCircuit : 0;
        event.days.forEach((day, dayIndex) => {
            if (day.circuit && day.circuit.name === circuit) {
                participant.paid_per_day[dayIndex] = paidPerDay;
            }
        });
        participant.package_payment = participant.package_payment || {};
        participant.package_payment[circuit] = newPaid; // Store package payment per circuit
    } else if (type === 'extra') {
        const paymentIdx = identifier;
        const payment = participant.payment_details[paymentIdx];
        payment.amount = parseFloat(document.getElementById(`extraAmount_${paymentIdx}`).value) || 0;
        payment.circuit = document.getElementById(`extraCircuit_${paymentIdx}`).value;
        payment.method = document.getElementById(`extraMethod_${paymentIdx}`).value;
        payment.date = document.getElementById(`extraDate_${paymentIdx}`).value;
        payment.observation = document.getElementById(`extraObservation_${paymentIdx}`).value || null;

        const daysParticipated = participant.car_per_day.filter(dayCars => dayCars.length > 0).length;
        const paymentPerDay = daysParticipated > 0 ? payment.amount / daysParticipated : 0;
        participant.paid_per_day = participant.paid_per_day.map((paid, dayIndex) => 
            participant.car_per_day[dayIndex].length > 0 ? paid + paymentPerDay : paid
        );
    }

    saveData();
    viewAndEditPayments(participantIndex);
}

function deletePayment(participantIndex, paymentIdx) {
    const event = events[currentEventIndex];
    const participant = event.participants[participantIndex];
    const payment = participant.payment_details[paymentIdx];
    const daysParticipated = participant.car_per_day.filter(dayCars => dayCars.length > 0).length;
    const paymentPerDay = daysParticipated > 0 ? payment.amount / daysParticipated : 0;
    participant.paid_per_day = participant.paid_per_day.map((paid, dayIndex) => 
        participant.car_per_day[dayIndex].length > 0 ? paid - paymentPerDay : paid
    );
    participant.payment_details.splice(paymentIdx, 1);
    saveData();
    viewAndEditPayments(participantIndex);
}

// --- Clients Section ---

function showAddClientForm() {
    document.getElementById('addClientForm').style.display = 'block';
    document.getElementById('clientsTable').classList.add('hidden'); // Hide table
}

function addClient() {
    const name = document.getElementById('clientName').value;
    const surname = document.getElementById('clientSurname').value;
    const email = document.getElementById('clientEmail').value;
    const country = document.getElementById('clientCountry').value;

    if (!name || !surname || !email || !country) {
        alert("Please fill in all fields.");
        return;
    }
    
    clients.push({ name, surname, email, country, events: [] });

    saveData();
    document.getElementById('addClientForm').style.display = 'none';
    document.getElementById('clientsTable').classList.remove('hidden'); // Show table
    updateClientsTable();
}

function cancelAddClient() {
    document.getElementById('addClientForm').style.display = 'none';
}

function showImportClientsForm() {
    document.getElementById('importClientsForm').style.display = 'block';
    document.getElementById('clientsTable').classList.add('hidden'); // Hide table
}

function importClients() {
    const fileInput = document.getElementById('clientsFile');
    const file = fileInput.files[0];
    if (!file) {
        alert("Please select a CSV file to import.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
        for (let i = 1; i < rows.length; i++) {
            const [name, surname, email, country] = rows[i];
            if (name && surname && email && country) {
                clients.push({ name, surname, email, country, events: [] });
            }
        }
        saveData();
        document.getElementById('importClientsForm').style.display = 'none';
        document.getElementById('clientsTable').classList.remove('hidden'); // Show table
        updateClientsTable();
    };
    reader.readAsText(file);
}

function updateClientsTable() {
    const tbody = document.querySelector('#clientsTable tbody');
    tbody.innerHTML = '';
    clients.forEach((client, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${client.name}</td>
            <td>${client.surname}</td>
            <td>${client.email}</td>
            <td>${client.country}</td>
            <td><button onclick="editClient(${index})">Edit</button></td>
            <td><button onclick="deleteClient(${index})">Delete</button></td>
        `;
        tbody.appendChild(row);
    });
}

function deleteClient(index) {
    if (confirm(`Are you sure you want to delete client "${clients[index].name} ${clients[index].surname}"?`)) {
        clients.splice(index, 1);
        saveData();
        updateClientsTable();
    }
}

function editClient(index) {
    currentClientIndex = index;
    const client = clients[index];
    document.getElementById('editClientName').value = client.name;
    document.getElementById('editClientSurname').value = client.surname;
    document.getElementById('editClientEmail').value = client.email;
    document.getElementById('editClientCountry').value = client.country;
    document.getElementById('editClientForm').style.display = 'block';
    document.getElementById('clientsTable').classList.add('hidden'); // Hide table
}

function saveEditedClient() {
    const client = clients[currentClientIndex];
    const name = document.getElementById('editClientName').value;
    const surname = document.getElementById('editClientSurname').value;
    const email = document.getElementById('editClientEmail').value;
    const country = document.getElementById('editClientCountry').value;

    if (!name || !surname || !email || !country) {
        alert("Please fill in all fields.");
        return;
    }

    client.name = name;
    client.surname = surname;
    client.email = email;
    client.country = country;

    events.forEach(event => {
        event.participants.forEach(participant => {
            if (participant.client === clients[currentClientIndex]) {
                participant.client = client;
            }
        });
        for (let day in event.cars_assigned) {
            for (let car in event.cars_assigned[day]) {
                if (event.cars_assigned[day][car] === `${clients[currentClientIndex].name} ${clients[currentClientIndex].surname}`) {
                    event.cars_assigned[day][car] = `${name} ${surname}`;
                }
            }
        }
    });

    saveData();
    document.getElementById('editClientForm').style.display = 'none';
    document.getElementById('clientsTable').classList.remove('hidden'); // Show table
    updateClientsTable();
}

// --- Cars Section ---

function showAddCarForm() {
    document.getElementById('addCarForm').style.display = 'block';
    document.getElementById('carsTable').classList.add('hidden'); // Hide table
}

function addCar() {
    const brand = document.getElementById('carBrand').value;
    const model = document.getElementById('carModel').value;
    const plate = document.getElementById('carPlate').value;
    const basicPriceLap = parseFloat(document.getElementById('carBasicPriceLap').value);
    const allIncPriceLap = parseFloat(document.getElementById('carAllIncPriceLap').value);
    const basicPriceKm = parseFloat(document.getElementById('carBasicPriceKm').value);
    const fuelCostKm = parseFloat(document.getElementById('carFuelCostKm').value);

    if (!brand || !model || !plate || isNaN(basicPriceLap) || isNaN(allIncPriceLap) || isNaN(basicPriceKm) || isNaN(fuelCostKm)) {
        alert("Please fill in all fields with valid values.");
        return;
    }

    if (cars.some(car => car.license_plate === plate)) {
        alert("This license plate is already in use. Please use a unique license plate.");
        return;
    }

    cars.push({
        brand,
        model,
        license_plate: plate,
        basic_price_lap: basicPriceLap,
        all_inc_price_lap: allIncPriceLap,
        basic_price_km: basicPriceKm,
        fuel_cost_km: fuelCostKm,
        highest_mileage: 0
    });
    saveData();
    document.getElementById('addCarForm').style.display = 'none';
    document.getElementById('carsTable').classList.remove('hidden'); // Show table
    updateCarsTable();
}

function cancelAddCar() {
    document.getElementById('addCarForm').style.display = 'none';
}

function showImportCarsForm() {
    document.getElementById('importCarsForm').style.display = 'block';
    document.getElementById('carsTable').classList.add('hidden'); // Hide table
}

function importCars() {
    const fileInput = document.getElementById('carsFile');
    const file = fileInput.files[0];
    if (!file) {
        alert("Please select a CSV file to import.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
        const expectedHeaders = ['brand', 'model', 'license_plate', 'basic_price_lap', 'all_inc_price_lap', 'basic_price_km', 'fuel_cost_km'];
        const headers = rows[0];
        if (!expectedHeaders.every((header, index) => header === headers[index])) {
            alert("Invalid CSV format. Expected headers: " + expectedHeaders.join(', '));
            return;
        }

        for (let i = 1; i < rows.length; i++) {
            const [brand, model, license_plate, basic_price_lap, all_inc_price_lap, basic_price_km, fuel_cost_km] = rows[i];
            if (!brand || !model || !license_plate) {
                alert(`Invalid data in row ${i + 1}: Brand, model, and license plate are required.`);
                continue;
            }

            const basicPriceLapNum = parseFloat(basic_price_lap);
            const allIncPriceLapNum = parseFloat(all_inc_price_lap);
            const basicPriceKmNum = parseFloat(basic_price_km);
            const fuelCostKmNum = parseFloat(fuel_cost_km);

            if (isNaN(basicPriceLapNum) || isNaN(allIncPriceLapNum) || isNaN(basicPriceKmNum) || isNaN(fuelCostKmNum)) {
                alert(`Invalid data in row ${i + 1}: All pricing fields must be numeric.`);
                continue;
            }

            if (cars.some(car => car.license_plate === license_plate)) {
                alert(`Duplicate license plate in row ${i + 1}: ${license_plate}. Each car must have a unique license plate.`);
                continue;
            }

            cars.push({
                brand,
                model,
                license_plate,
                basic_price_lap: basicPriceLapNum,
                all_inc_price_lap: allIncPriceLapNum,
                basic_price_km: basicPriceKmNum,
                fuel_cost_km: fuelCostKmNum,
                highest_mileage: 0
            });
        }

        saveData();
        document.getElementById('importCarsForm').style.display = 'none';
        document.getElementById('carsTable').classList.remove('hidden'); // Show table
        updateCarsTable();
    };
    reader.readAsText(file);
}

function updateCarsTable() {
    const tbody = document.querySelector('#carsTable tbody');
    tbody.innerHTML = '';
    cars.forEach((car, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${car.brand}</td>
            <td>${car.model}</td>
            <td>${car.license_plate}</td>
            <td>€${car.basic_price_lap.toFixed(2)}</td>
            <td>€${car.all_inc_price_lap.toFixed(2)}</td>
            <td>€${car.basic_price_km.toFixed(2)}</td>
            <td>€${car.fuel_cost_km.toFixed(2)}</td>
            <td>${car.highest_mileage.toFixed(2)}</td>
            <td><button onclick="editCar(${index})">Edit</button></td>
            <td><button onclick="deleteCar(${index})">Delete</button></td>
        `;
        tbody.appendChild(row);
    });
}

function deleteCar(index) {
    if (confirm(`Are you sure you want to delete car "${cars[index].brand} ${cars[index].model} (${cars[index].license_plate})"?`)) {
        cars.splice(index, 1);
        saveData();
        updateCarsTable();
    }
}

function editCar(index) {
    currentCarIndex = index;
    const car = cars[index];
    document.getElementById('editCarBrand').value = car.brand;
    document.getElementById('editCarModel').value = car.model;
    document.getElementById('editCarPlate').value = car.license_plate;
    document.getElementById('editCarBasicPriceLap').value = car.basic_price_lap;
    document.getElementById('editCarAllIncPriceLap').value = car.all_inc_price_lap;
    document.getElementById('editCarBasicPriceKm').value = car.basic_price_km;
    document.getElementById('editCarFuelCostKm').value = car.fuel_cost_km;
    document.getElementById('editCarForm').style.display = 'block';
    document.getElementById('carsTable').classList.add('hidden'); // Hide table
}

function saveEditedCar() {
    const car = cars[currentCarIndex];
    const brand = document.getElementById('editCarBrand').value;
    const model = document.getElementById('editCarModel').value;
    const plate = document.getElementById('editCarPlate').value;
    const basicPriceLap = parseFloat(document.getElementById('editCarBasicPriceLap').value);
    const allIncPriceLap = parseFloat(document.getElementById('editCarAllIncPriceLap').value);
    const basicPriceKm = parseFloat(document.getElementById('editCarBasicPriceKm').value);
    const fuelCostKm = parseFloat(document.getElementById('editCarFuelCostKm').value);

    if (!brand || !model || !plate || isNaN(basicPriceLap) || isNaN(allIncPriceLap) || isNaN(basicPriceKm) || isNaN(fuelCostKm)) {
        alert("Please fill in all fields with valid values.");
        return;
    }

    if (cars.some((c, idx) => c.license_plate === plate && idx !== currentCarIndex)) {
        alert("This license plate is already in use. Please use a unique license plate.");
        return;
    }

    const oldPlate = car.license_plate;
    car.brand = brand;
    car.model = model;
    car.license_plate = plate;
    car.basic_price_lap = basicPriceLap;
    car.all_inc_price_lap = allIncPriceLap;
    car.basic_price_km = basicPriceKm;
    car.fuel_cost_km = fuelCostKm;

    events.forEach(event => {
        if (event.available_cars.includes(oldPlate)) {
            event.available_cars[event.available_cars.indexOf(oldPlate)] = plate;
        }
        event.participants.forEach(participant => {
            participant.car_per_day = participant.car_per_day.map(carPlate => carPlate === oldPlate ? plate : carPlate);
        });
        for (let day in event.cars_assigned) {
            if (event.cars_assigned[day][oldPlate]) {
                const client = event.cars_assigned[day][oldPlate];
                delete event.cars_assigned[day][oldPlate];
                event.cars_assigned[day][plate] = client;
            }
        }
        for (let key in event.pricing) {
            if (key.startsWith(`${oldPlate}_`)) {
                const newKey = key.replace(oldPlate, plate);
                event.pricing[newKey] = event.pricing[key];
                delete event.pricing[key];
            }
        }
    });

    saveData();
    document.getElementById('editCarForm').style.display = 'none';
    document.getElementById('carsTable').classList.remove('hidden'); // Show table
    updateCarsTable();
}

// --- Circuits Section ---

function showAddCircuitForm() {
    document.getElementById('addCircuitForm').style.display = 'block';
    document.getElementById('circuitsTable').classList.add('hidden'); // Hide table
}

function addCircuit() {
    const name = document.getElementById('circuitName').value;
    const country = document.getElementById('circuitCountry').value;
    const length = parseFloat(document.getElementById('circuitLength').value);
    const pricingType = document.getElementById('circuitPricingType').value;

    if (!name || !country || isNaN(length)) {
        alert("Please fill in all fields with valid values.");
        return;
    }

    circuits.push({ name, country, length, pricing_type: pricingType });

    saveData();
    document.getElementById('addCircuitForm').style.display = 'none';
    document.getElementById('circuitsTable').classList.remove('hidden'); // Show table
    updateCircuitsTable();
}

function cancelAddCircuit() {
    document.getElementById('addCircuitForm').style.display = 'none';
}

function showImportCircuitsForm() {
    document.getElementById('importCircuitsForm').style.display = 'block';
    document.getElementById('circuitsTable').classList.add('hidden'); // Hide table
}

function importCircuits() {
    const fileInput = document.getElementById('circuitsFile');
    const file = fileInput.files[0];
    if (!file) {
        alert("Please select a CSV file to import.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
        const expectedHeaders = ['name', 'country', 'length', 'pricing_type'];
        const headers = rows[0];
        if (!expectedHeaders.every((header, index) => header === headers[index])) {
            alert("Invalid CSV format. Expected headers: " + expectedHeaders.join(', '));
            return;
        }

        for (let i = 1; i < rows.length; i++) {
            const [name, country, length, pricing_type] = rows[i];
            if (!name || !country) {
                alert(`Invalid data in row ${i + 1}: Name and country are required.`);
                continue;
            }

            const lengthNum = parseFloat(length);
            if (isNaN(lengthNum)) {
                alert(`Invalid data in row ${i + 1}: Length must be a numeric value.`);
                continue;
            }

            if (pricing_type !== 'per km' && pricing_type !== 'per lap') {
                alert(`Invalid data in row ${i + 1}: Pricing type must be 'per km' or 'per lap'.`);
                continue;
            }

            if (circuits.some(circuit => circuit.name === name)) {
                alert(`Duplicate circuit name in row ${i + 1}: ${name}. Each circuit must have a unique name.`);
                continue;
            }

            circuits.push({ name, country, length: lengthNum, pricing_type });
        }

        saveData();
        document.getElementById('importCircuitsForm').style.display = 'none';
        document.getElementById('circuitsTable').classList.remove('hidden'); // Show table
        updateCircuitsTable();
    };
    reader.readAsText(file);
}

function updateCircuitsTable() {
    const tbody = document.querySelector('#circuitsTable tbody');
    tbody.innerHTML = '';
    circuits.forEach((circuit, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${circuit.name}</td>
            <td>${circuit.country}</td>
            <td>${circuit.length}</td>
            <td>${circuit.pricing_type}</td>
            <td><button onclick="editCircuit(${index})">Edit</button></td>
            <td><button onclick="deleteCircuit(${index})">Delete</button></td>
        `;
        tbody.appendChild(row);
    });
}

function deleteCircuit(index) {
    if (confirm(`Are you sure you want to delete circuit "${circuits[index].name}"?`)) {
        circuits.splice(index, 1);
        saveData();
        updateCircuitsTable();
    }
}

function editCircuit(index) {
    currentCircuitIndex = index;
    const circuit = circuits[index];
    document.getElementById('editCircuitName').value = circuit.name;
    document.getElementById('editCircuitCountry').value = circuit.country;
    document.getElementById('editCircuitLength').value = circuit.length;
    document.getElementById('editCircuitPricingType').value = circuit.pricing_type;
    document.getElementById('editCircuitForm').style.display = 'block';
    document.getElementById('circuitsTable').classList.add('hidden'); // Hide table
}

function saveEditedCircuit() {
    const circuit = circuits[currentCircuitIndex];
    const name = document.getElementById('editCircuitName').value;
    const country = document.getElementById('editCircuitCountry').value;
    const length = parseFloat(document.getElementById('editCircuitLength').value);
    const pricingType = document.getElementById('editCircuitPricingType').value;

    if (!name || !country || isNaN(length)) {
        alert("Please fill in all fields with valid values.");
        return;
    }

    if (circuits.some((c, idx) => c.name === name && idx !== currentCircuitIndex)) {
        alert("This circuit name is already in use. Please use a unique name.");
        return;
    }

    const oldName = circuit.name;
    circuit.name = name;
    circuit.country = country;
    circuit.length = length;
    circuit.pricing_type = pricingType;

    events.forEach(event => {
        event.days.forEach(day => {
            if (day.circuit && day.circuit.name === oldName) {
                day.circuit = circuit;
            }
        });
    });

    saveData();
    document.getElementById('editCircuitForm').style.display = 'none';
    document.getElementById('circuitsTable').classList.remove('hidden'); // Show table
    updateCircuitsTable();
}

// --- Price List Section ---

function updatePriceListTable() {
    const header = document.getElementById('priceListTableHeader');
    const tbody = document.getElementById('priceListTableBody');

    let headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>Car</th><th>License Plate</th>';
    for (let laps = 1; laps <= 20; laps++) {
        headerRow.innerHTML += `<th>${laps} Lap${laps > 1 ? 's' : ''} (Basic)</th><th>${laps} Lap${laps > 1 ? 's' : ''} (Fuel-Inc)</th><th>${laps} Lap${laps > 1 ? 's' : ''} (All-Inc)</th>`;
    }
    headerRow.innerHTML += '<th>200 km (Basic)</th><th>200 km (Fuel-Inc, Spa/Nürburgring)</th>';
    headerRow.innerHTML += '<th>200 km (Fuel-Inc, Other Tracks)</th>';
    headerRow.innerHTML += '<th>300 km (Basic)</th><th>300 km (Fuel-Inc, Spa/Nürburgring)</th>';
    headerRow.innerHTML += '<th>300 km (Fuel-Inc, Other Tracks)</th>';
    headerRow.innerHTML += '<th>400 km (Basic)</th><th>400 km (Fuel-Inc, Spa/Nürburgring)</th>';
    headerRow.innerHTML += '<th>400 km (Fuel-Inc, Other Tracks)</th>';
    header.innerHTML = '';
    header.appendChild(headerRow);

    tbody.innerHTML = '';
    cars.forEach(car => {
        const row = document.createElement('tr');
        let rowHTML = `<td>${car.brand} ${car.model}</td><td>${car.license_plate}</td>`;
        for (let laps = 1; laps <= 20; laps++) {
            const discount = getDiscount(laps, "per lap");
            const basicCost = car.basic_price_lap * laps * (1 - discount);
            const fuelIncCost = basicCost + (car.all_inc_price_lap - 35) * laps; // New fuel-inc calculation
            const allIncCost = basicCost + (car.all_inc_price_lap * laps);
            rowHTML += `<td>€${Math.round(basicCost)}</td><td>€${Math.round(fuelIncCost)}</td><td>€${Math.round(allIncCost)}</td>`;
        }

        const kmValues = [200, 300, 400];
        kmValues.forEach(km => {
            const discount = getDiscount(km, "per km");
            const basicCost = car.basic_price_km * km * (1 - discount);
            const baseFuelCostSpaNurburgring = Math.round(car.fuel_cost_km * 10) / 10;
            const fuelIncCostSpaNurburgring = basicCost + (km * baseFuelCostSpaNurburgring);
            const baseFuelCostOther = Math.round((car.fuel_cost_km * 1.3) * 10) / 10;
            const fuelIncCostOther = basicCost + (km * baseFuelCostOther);
            rowHTML += `<td>€${Math.round(basicCost)}</td><td>€${Math.round(fuelIncCostSpaNurburgring)}</td><td>€${Math.round(fuelIncCostOther)}</td>`;
        });

        row.innerHTML = rowHTML;
        tbody.appendChild(row);
    });
}

function exportPriceList() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait' });

    const narrowMargin = 5;
    const uniqueCars = Object.values(cars.reduce((acc, car) => {
        acc[`${car.brand} ${car.model}`] = car;
        return acc;
    }, {}));

    // 1. Basic Prices per Lap (Light Blue)
    doc.setFontSize(12);
    doc.text('Basic Prices per Lap', narrowMargin, narrowMargin + 5);
    const basicLapHeaders = ['Car Model', '4 Laps', '6 Laps', '10 Laps'];
    const basicLapData = uniqueCars.map(car => {
        const model = `${car.brand} ${car.model}`;
        const laps = [4, 6, 10];
        const row = [model];
        laps.forEach(lap => {
            const discount = getDiscount(lap, "per lap");
            const basicCost = car.basic_price_lap * lap * (1 - discount);
            row.push(`€${Math.round(basicCost)}`);
        });
        return row;
    });
    doc.autoTable({
        startY: narrowMargin + 10,
        head: [basicLapHeaders],
        body: basicLapData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [173, 216, 230] },
        columnStyles: { 0: { cellWidth: 50 } },
        margin: { left: narrowMargin, right: narrowMargin }
    });

    // 2. Fuel-Inclusive Prices per Lap (Light Yellow)
    doc.addPage();
    doc.setFontSize(12);
    doc.text('Fuel-Inclusive Prices per Lap', narrowMargin, narrowMargin + 5);
    const fuelIncLapHeaders = ['Car Model', '4 Laps', '6 Laps', '10 Laps'];
    const fuelIncLapData = uniqueCars.map(car => {
        const model = `${car.brand} ${car.model}`;
        const laps = [4, 6, 10];
        const row = [model];
        laps.forEach(lap => {
            const discount = getDiscount(lap, "per lap");
            const basicCost = car.basic_price_lap * lap * (1 - discount);
            const fuelIncCost = basicCost + (car.all_inc_price_lap - 35) * lap;
            row.push(`€${Math.round(fuelIncCost)}`);
        });
        return row;
    });
    doc.autoTable({
        startY: narrowMargin + 10,
        head: [fuelIncLapHeaders],
        body: fuelIncLapData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [255, 255, 224] }, // Light Yellow
        columnStyles: { 0: { cellWidth: 50 } },
        margin: { left: narrowMargin, right: narrowMargin }
    });

    // 3. All-Inclusive Prices per Lap (Light Red)
    doc.addPage();
    doc.setFontSize(12);
    doc.text('All-Inclusive Prices per Lap', narrowMargin, narrowMargin + 5);
    const allIncLapHeaders = ['Car Model', '4 Laps', '6 Laps', '10 Laps'];
    const allIncLapData = uniqueCars.map(car => {
        const model = `${car.brand} ${car.model}`;
        const laps = [4, 6, 10];
        const row = [model];
        laps.forEach(lap => {
            const discount = getDiscount(lap, "per lap");
            const basicCost = car.basic_price_lap * lap * (1 - discount);
            const allIncCost = basicCost + (car.all_inc_price_lap * lap);
            row.push(`€${Math.round(allIncCost)}`);
        });
        return row;
    });
    doc.autoTable({
        startY: narrowMargin + 10,
        head: [allIncLapHeaders],
        body: allIncLapData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [255, 182, 193] },
        columnStyles: { 0: { cellWidth: 50 } },
        margin: { left: narrowMargin, right: narrowMargin }
    });

    // 4. Basic and Fuel-Inclusive Prices per km (Blue)
    doc.addPage();
    doc.setFontSize(12);
    doc.text('Basic and Fuel-Inclusive Prices per km', narrowMargin, narrowMargin + 5);
    const kmHeaders = ['Car Model', '200km Basic', '300km Basic', '400km Basic', '200km Fuel-Inc', '300km Fuel-Inc', '400km Fuel-Inc'];
    const kmData = uniqueCars.map(car => {
        const model = `${car.brand} ${car.model}`;
        const kms = [200, 300, 400];
        const row = [model];
        kms.forEach(km => {
            const discount = getDiscount(km, "per km");
            const basicCost = car.basic_price_km * km * (1 - discount);
            row.push(`€${Math.round(basicCost)}`);
        });
        kms.forEach(km => {
            const discount = getDiscount(km, "per km");
            const basicCost = car.basic_price_km * km * (1 - discount);
            const baseFuelCost = Math.round(car.fuel_cost_km * 10) / 10;
            const fuelIncCost = basicCost + (km * baseFuelCost);
            row.push(`€${Math.round(fuelIncCost)}`);
        });
        return row;
    });
    doc.autoTable({
        startY: narrowMargin + 10,
        head: [kmHeaders],
        body: kmData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [135, 206, 235] },
        columnStyles: { 0: { cellWidth: 50 } },
        margin: { left: narrowMargin, right: narrowMargin }
    });

    // 5. Fuel-Inclusive for Other Circuits (Light Green)
    doc.addPage();
    doc.setFontSize(12);
    doc.text('Fuel-Inclusive Prices per km (Other Circuits with 30% Fuel Surcharge)', narrowMargin, narrowMargin + 5);
    const otherKmHeaders = ['Car Model', '200km Fuel-Inc', '300km Fuel-Inc', '400km Fuel-Inc'];
    const otherKmData = uniqueCars.map(car => {
        const model = `${car.brand} ${car.model}`;
        const kms = [200, 300, 400];
        const row = [model];
        kms.forEach(km => {
            const discount = getDiscount(km, "per km");
            const basicCost = car.basic_price_km * km * (1 - discount);
            const baseFuelCost = Math.round((car.fuel_cost_km * 1.3) * 10) / 10;
            const fuelIncCost = basicCost + (km * baseFuelCost);
            row.push(`€${Math.round(fuelIncCost)}`);
        });
        return row;
    });
    doc.autoTable({
        startY: narrowMargin + 10,
        head: [otherKmHeaders],
        body: otherKmData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [144, 238, 144] },
        columnStyles: { 0: { cellWidth: 50 } },
        margin: { left: narrowMargin, right: narrowMargin }
    });

    doc.save('Price_List.pdf');
}
