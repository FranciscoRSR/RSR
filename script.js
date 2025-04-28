// Firebase Initialization
const firebaseConfig = {
    apiKey: "AIzaSyCVH9tFfsmm040flswAVgPoXWAqcb_CDqY",
    authDomain: "rsr-event-management.firebaseapp.com",
    databaseURL: "https://rsr-event-management-default-rtdb.firebaseio.com", // Add this
    projectId: "rsr-event-management",
    storageBucket: "rsr-event-management.appspot.com", // Corrected
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
    loadData(); // Only call loadData if initialization succeeds
} catch (error) {
    console.error("Firebase initialization failed:", error);
    alert("Failed to connect to database. Running in offline mode.");
    events = [];
    clients = [];
    cars = [];
    circuits = [];
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

// Add this at the top of script.js
const themeToggle = document.getElementById('themeToggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

function toggleTheme() {
    if (themeToggle.checked) {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    }
}

// Initialize theme based on localStorage or system preference
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.checked = true;
    } else {
        document.body.removeAttribute('data-theme');
        themeToggle.checked = false;
    }
}

// Add event listener for theme toggle
themeToggle.addEventListener('change', toggleTheme);

// Call initializeTheme on page load
document.addEventListener('DOMContentLoaded', initializeTheme);

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'flex';
    // Add a small delay before adding the show class for the animation to work
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    // Wait for the animation to complete before hiding the modal
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

function saveData() {
    if (!db) {
        console.warn("Database not available. Data not saved.");
        alert("Cannot save data: No database connection.");
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
        console.warn("Database not available. Using local data.");
        updateEventsTable();
        updateClientsTable();
        updateCarsTable();
        updateCircuitsTable();
        return;
    }
    eventsRef.once('value', (snapshot) => {
        events = snapshot.val() || [];
        events = events.map(event => ({
            ...event,
            days: Array.isArray(event.days) ? event.days : [],
            participants: Array.isArray(event.participants) ? event.participants : []
        }));
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
    }
    showSection('events'); // Show events screen by default
};

function isValidDate(year, month, day) {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() == year && date.getMonth() == month - 1 && date.getDate() == day;
}

// Show a specific section and hide others
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show requested section
    document.getElementById(sectionId).classList.add('active');
    
    // Special case for Price List section
    if (sectionId === 'priceList') {
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
        pricing: {} // Initialize empty pricing object
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
    if (!events[index]) {
        console.error("Invalid event index:", index);
        return;
    }
    const event = events[index];

    // Populate the edit form
    document.getElementById('editEventName').textContent = event.name;
    const daysDiv = document.getElementById('editEventDays');
    daysDiv.innerHTML = '';
    event.days.forEach((day, i) => {
        daysDiv.innerHTML += `<p>Day ${i + 1}: ${day.date}, Circuit: ${day.circuit ? day.circuit.name : 'Not Assigned'}</p>`;
    });

    // Add the new "Remaining Package" button next to "View Event Overview"
    document.getElementById('eventDetails').innerHTML = `
        <button onclick="showEditEventDetailsForm()">Edit Event Details</button>
        <button onclick="assignCircuits()">Assign Circuits</button>
        <button onclick="assignCarsPricing()">Assign Cars</button>
        <button onclick="toggleParticipantsSection()">Add Participants</button>
        <button onclick="enterDrivenData()">Enter kms/laps done</button>
        <button onclick="clientPackage()">Client Package</button>
        <button onclick="processBalances()">Add payments</button>
        <button onclick="viewEvent(${index})">View Event Overview</button>
        <button onclick="showRemainingPackage()">Remaining Package</button>
    `;

    // Hide the events table and controls, show the edit form
    document.getElementById('eventsTable').style.display = 'none';
    document.getElementById('eventsControls').style.display = 'none';
    document.getElementById('editEventForm').style.display = 'block';
    document.getElementById('addEventForm').style.display = 'none';

    hideAllEditForms();

    if (document.getElementById('participantsSection')) {
        updateParticipantsTable();
    }
}



function toggleParticipantsSection() {
    if (currentEventIndex === null || !events[currentEventIndex]) {
        console.error('No event selected for adding participants');
        alert('Please select an event to edit first');
        return;
    }
    hideAllEditForms();
    const section = document.getElementById('participantsSection');
    section.style.display = section.style.display === 'none' || section.style.display === '' ? 'block' : 'none';
    if (section.style.display === 'block') {
        updateParticipantsTable(); // Ensure table updates when section is shown
    }
    document.getElementById('clientMultiSelect').style.display = 'none';
}

function updateParticipantsTable() {
    const event = events[currentEventIndex];
    const header = document.getElementById('participantsTableHeader');
    const tbody = document.getElementById('participantsTableBody');

    if (!event || !Array.isArray(event.days)) {
        console.error('Invalid event or days array:', event);
        header.innerHTML = '<tr><th>Error: No valid days data</th></tr>';
        tbody.innerHTML = '<tr><td colspan="2">Please check event data</td></tr>';
        return;
    }

    // Build header
    let headerHTML = '<tr><th>Client</th>';
    event.days.forEach((day, i) => {
        headerHTML += `<th>Day ${i + 1} (${day.date}, ${day.circuit ? day.circuit.name : 'N/A'})</th>`;
    });
    headerHTML += '<th>Actions</th></tr>';
    header.innerHTML = headerHTML;

    // Build body
    tbody.innerHTML = '';
    event.participants.forEach((participant, participantIndex) => {
        const row = document.createElement('tr');
        let rowHTML = `<td>${participant.client.name} ${participant.client.surname}</td>`;

        event.days.forEach((day, dayIndex) => {
            // Initialize arrays if they don't exist
            if (!participant.car_per_day) participant.car_per_day = [];
            if (!participant.package_per_day) participant.package_per_day = [];
            if (!participant.driven_per_day) participant.driven_per_day = [];
            
            // Ensure arrays for this day exist
            if (!participant.car_per_day[dayIndex]) participant.car_per_day[dayIndex] = [];
            if (!participant.package_per_day[dayIndex]) participant.package_per_day[dayIndex] = [];
            if (!participant.driven_per_day[dayIndex]) participant.driven_per_day[dayIndex] = [];

            const carsForDay = participant.car_per_day[dayIndex] || [];
            const packagesForDay = participant.package_per_day[dayIndex] || [];
            let cellHTML = '<div class="car-selection-group">';

            if (carsForDay.length > 0) {
                carsForDay.forEach((carPlate, carIndex) => {
                    const allCars = event.available_cars.map(plate => {
                        const car = cars.find(c => c.license_plate === plate);
                        return `<option value="${plate}" ${plate === carPlate ? 'selected' : ''}>${car ? `${car.model} (${plate})` : plate}</option>`;
                    }).join('');

                    const circuit = day.circuit;
                    const carPricingType = event.pricing[`${carPlate}_pricing_type`] || 'standard';
                    let packageOptions = '';

                    if (carPricingType === 'fixed_lap' && circuit && circuit.pricing_type === 'per lap') {
                        packageOptions = `
                            <option value="fixed" ${packagesForDay[carIndex] === 'fixed' ? 'selected' : ''}>Fixed Price</option>
                            <option value="basic" ${packagesForDay[carIndex] === 'basic' ? 'selected' : ''}>Basic</option>
                            <option value="fuel_inc" ${packagesForDay[carIndex] === 'fuel_inc' ? 'selected' : ''}>Fuel-Inc</option>
                            <option value="all_inc" ${packagesForDay[carIndex] === 'all_inc' ? 'selected' : ''}>All-Inc</option>
                        `;
                    } else if (carPricingType === 'fixed_km' && circuit && circuit.pricing_type === 'per km') {
                        packageOptions = `
                            <option value="fixed" ${packagesForDay[carIndex] === 'fixed' ? 'selected' : ''}>Fixed Price</option>
                            <option value="basic" ${packagesForDay[carIndex] === 'basic' ? 'selected' : ''}>Basic</option>
                            <option value="fuel_inc" ${packagesForDay[carIndex] === 'fuel_inc' ? 'selected' : ''}>Fuel-Inc</option>
                        `;
                    } else if (circuit && circuit.pricing_type === "per lap") {
                        packageOptions = `
                            <option value="basic" ${packagesForDay[carIndex] === 'basic' ? 'selected' : ''}>Basic</option>
                            <option value="fuel_inc" ${packagesForDay[carIndex] === 'fuel_inc' ? 'selected' : ''}>Fuel-Inc</option>
                            <option value="all_inc" ${packagesForDay[carIndex] === 'all_inc' ? 'selected' : ''}>All-Inc</option>
                        `;
                    } else {
                        packageOptions = `
                            <option value="basic" ${packagesForDay[carIndex] === 'basic' ? 'selected' : ''}>Basic</option>
                            <option value="fuel_inc" ${packagesForDay[carIndex] === 'fuel_inc' ? 'selected' : ''}>Fuel-Inc</option>
                        `;
                    }

                    cellHTML += `
                        <div class="car-selection">
                            <select id="car_${participantIndex}_${dayIndex}_${carIndex}">
                                <option value="">Select Car</option>
                                ${allCars}
                            </select>
                            <select id="package_${participantIndex}_${dayIndex}_${carIndex}">
                                ${packageOptions}
                            </select>
                            <button class="remove-car-btn" onclick="this.parentElement.remove()">Remove</button>
                        </div>`;
                });
            } else {
                cellHTML += '<p>No cars assigned</p>';
            }

            cellHTML += `<button class="add-car-btn" onclick="addCarSelection(${participantIndex}, ${dayIndex})">Add Car</button>`;
            cellHTML += '</div>';
            rowHTML += `<td>${cellHTML}</td>`;
        });

        rowHTML += `
            <td>
                <button onclick="removeParticipant(${participantIndex})">Remove</button>
            </td>`;
        row.innerHTML = rowHTML;
        tbody.appendChild(row);
    });
}

// Filter clients based on search input
function filterClients() {
    const searchTerm = document.getElementById('clientSearch').value.toLowerCase();
    const dropdown = document.getElementById('clientMultiSelect');
    const clientOptions = document.getElementById('clientOptions');
    const event = events[currentEventIndex];

    // Defensive check
    if (!event || !Array.isArray(event.participants)) {
        console.error('No valid event or participants:', event);
        clientOptions.innerHTML = '<label>No event selected or participants data missing</label>';
        dropdown.style.display = 'block';
        return;
    }

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

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('eventsBtn').addEventListener('click', () => showSection('events'));
    document.getElementById('clientsBtn').addEventListener('click', () => showSection('clients'));
    document.getElementById('carsBtn').addEventListener('click', () => showSection('cars'));
    document.getElementById('circuitsBtn').addEventListener('click', () => showSection('circuits'));
    document.getElementById('priceListBtn').addEventListener('click', () => showSection('priceList'));
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

function showForm(formId) {
    document.getElementById(formId).classList.add('active');
}

function hideForm(formId) {
    document.getElementById(formId).classList.remove('active');
}

// Add selected clients from multi-select
function addSelectedClients() {
    const event = events[currentEventIndex];
    selectedClients.forEach(selectedClientName => {
        const client = clients.find(c => `${c.name} ${c.surname}` === selectedClientName);
        if (client && !event.participants.some(p => `${p.client.name} ${p.client.surname}` === selectedClientName)) {
            // Initialize arrays with proper length
            const carsPerDay = Array(event.days.length).fill().map(() => []);
            const packagesPerDay = Array(event.days.length).fill().map(() => []);
            const drivenPerDay = Array(event.days.length).fill().map(() => []);

            event.participants.push({
                client,
                car_per_day: carsPerDay,
                package_per_day: packagesPerDay,
                driven_per_day: drivenPerDay,
                paid_per_day: Array(event.days.length).fill(0),
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
    const carPlate = event.available_cars[0]; // Default to first available car
    const car = cars.find(c => c.license_plate === carPlate);
    const pricingType = event.pricing && event.pricing[`${carPlate}_pricing_type`];
        
    let packageOptions = '';
    if (pricingType === 'fixed_lap' && circuit && circuit.pricing_type === 'per lap') {
        packageOptions = `
            <option value="fixed">Fixed Price</option>
            <option value="basic">Basic</option>
            <option value="fuel_inc">Fuel-Inc</option>
            <option value="all_inc">All-Inc</option>
        `;
    } else if (pricingType === 'fixed_km' && circuit && circuit.pricing_type === 'per km') {
        packageOptions = `
            <option value="fixed">Fixed Price</option>
            <option value="basic">Basic</option>
            <option value="fuel_inc">Fuel-Inc</option>
        `;
    } else if (circuit && circuit.pricing_type === "per lap") {
        packageOptions = `
            <option value="basic">Basic</option>
            <option value="fuel_inc">Fuel-Inc</option>
            <option value="all_inc">All-Inc</option>
        `;
    } else {
        packageOptions = `
            <option value="basic">Basic</option>
            <option value="fuel_inc">Fuel-Inc</option>
        `;
    }
    
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
    if (!event || !Array.isArray(event.days)) {
        console.error("Invalid event or days array:", event);
        alert("Error: Invalid event data.");
        return;
    }

    // Ensure cars_assigned is an object
    if (!event.cars_assigned || typeof event.cars_assigned !== 'object') {
        event.cars_assigned = {};
    }

    event.participants.forEach((participant, participantIndex) => {
        const carsPerDay = [];
        const packagesPerDay = [];

        // Initialize driven_per_day if it doesn't exist or is malformed
        if (!Array.isArray(participant.driven_per_day)) {
            participant.driven_per_day = Array(event.days.length).fill().map(() => []);
        } else if (participant.driven_per_day.length !== event.days.length) {
            participant.driven_per_day = Array(event.days.length).fill().map((_, i) => 
                i < participant.driven_per_day.length ? 
                [...participant.driven_per_day[i]] : 
                []
            );
        }

        // Get all rows in the participants table
        const participantRows = document.querySelectorAll('#participantsTableBody tr');
        
        // Only process if we found the participant row
        if (participantIndex >= participantRows.length) {
            console.warn(`No table row found for participant ${participantIndex}`);
            return;
        }

        const participantRow = participantRows[participantIndex];
        
        event.days.forEach((day, dayIndex) => {
            // Get the cell for this day (skip first cell which is client name)
            const dayCell = participantRow.cells[dayIndex + 1];
            if (!dayCell) {
                console.warn(`No cell found for day ${dayIndex} for participant ${participantIndex}`);
                return;
            }
            
            const carSelections = dayCell.querySelectorAll('.car-selection');
            const dayCars = [];
            const dayPackages = [];

            carSelections.forEach((selection, carIdx) => {
                const carSelect = selection.querySelector('select:first-of-type');
                const packageSelect = selection.querySelector('select:last-of-type');
                
                if (carSelect && packageSelect) {
                    const car = carSelect.value;
                    const packageType = packageSelect.value;

                    // Only add cars and packages if both are selected
                    if (car && packageType) {
                        dayCars.push(car);
                        dayPackages.push(packageType);
                        // Ensure cars_assigned[dayIndex] is initialized
                        if (!event.cars_assigned[dayIndex]) {
                            event.cars_assigned[dayIndex] = {};
                        }
                        event.cars_assigned[dayIndex][car] = `${participant.client.name} ${participant.client.surname}`;
                    }
                }
            });

            carsPerDay.push(dayCars);
            packagesPerDay.push(dayPackages);

            // Ensure driven_per_day[dayIndex] is properly initialized, even if no cars
            if (!Array.isArray(participant.driven_per_day[dayIndex])) {
                participant.driven_per_day[dayIndex] = Array(dayCars.length).fill(0);
            } else if (participant.driven_per_day[dayIndex].length !== dayCars.length) {
                // Adjust driven_per_day length to match cars (could be 0 if no cars)
                participant.driven_per_day[dayIndex] = Array(dayCars.length).fill(0);
            }
        });

        participant.car_per_day = carsPerDay;
        participant.package_per_day = packagesPerDay;
    });

    saveData();
    updateParticipantsTable();
    alert('Participants saved successfully!');
    editEvent(currentEventIndex);
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
    
    // Initialize pricing object if it doesn't exist
    if (!event.pricing) {
        event.pricing = {};
    }
    
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
        const selectedPlates = modelCars.filter(car => event.available_cars.includes(car.license_plate));
        const allSelected = selectedPlates.length === modelCars.length;
        const partialSelected = selectedPlates.length > 0 && selectedPlates.length < modelCars.length;
        
        availableCarsSelection.innerHTML += `
            <div class="model-group">
                <button class="model-btn ${allSelected ? 'selected' : partialSelected ? 'partial' : ''}" 
                        id="modelBtn_${model.replace(/\s+/g, '_')}" 
                        onclick="toggleModelSelection('${model}')">
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
            ${cars.map(car => {
                const isSelected = event.available_cars.includes(car.license_plate);
                return `
                    <div id="pricing_${car.license_plate}" style="display: ${isSelected ? 'block' : 'none'};">
                        <h5>${car.brand} ${car.model} (${car.license_plate})</h5>
                        <button class="expand-pricing-btn" onclick="toggleExpandPricing('${car.license_plate}')">Expand</button>
                        <div id="pricingDetails_${car.license_plate}" style="display: none;">
                            <label>
                                Pricing Type:
                                <select id="pricingType_${car.license_plate}">
                                    <option value="standard" ${(!event.pricing[`${car.license_plate}_pricing_type`] || event.pricing[`${car.license_plate}_pricing_type`] === 'standard') ? 'selected' : ''}>Standard Calculation</option>
                                    <option value="fixed_lap" ${event.pricing[`${car.license_plate}_pricing_type`] === 'fixed_lap' ? 'selected' : ''}>Fixed Price per Lap</option>
                                    <option value="fixed_km" ${event.pricing[`${car.license_plate}_pricing_type`] === 'fixed_km' ? 'selected' : ''}>Fixed Price per km</option>
                                </select>
                            </label>
                            <div id="standardPricing_${car.license_plate}">
                                <label>Basic Price per Lap: <input type="number" id="basicPriceLap_${car.license_plate}" value="${event.pricing[`${car.license_plate}_basic_lap`] !== undefined ? event.pricing[`${car.license_plate}_basic_lap`] : car.basic_price_lap}" step="0.01"></label><br>
                                <label>All-Inc Price per Lap: <input type="number" id="allIncPriceLap_${car.license_plate}" value="${event.pricing[`${car.license_plate}_all_inc_lap`] !== undefined ? event.pricing[`${car.license_plate}_all_inc_lap`] : car.all_inc_price_lap}" step="0.01"></label><br>
                                <label>Basic Price per km: <input type="number" id="basicPriceKm_${car.license_plate}" value="${event.pricing[`${car.license_plate}_basic_km`] !== undefined ? event.pricing[`${car.license_plate}_basic_km`] : car.basic_price_km}" step="0.01"></label><br>
                                <label>Fuel Cost per km: <input type="number" id="fuelCostKm_${car.license_plate}" value="${event.pricing[`${car.license_plate}_fuel_cost_km`] !== undefined ? event.pricing[`${car.license_plate}_fuel_cost_km`] : car.fuel_cost_km}" step="0.01"></label><br>
                                <label>Extra Discount (%): <input type="number" id="extraDiscount_${car.license_plate}" min="0" max="100" value="${event.pricing[`${car.license_plate}_extra_discount`] || 0}" step="1"></label><br>
                                <label>
                                    Discount Applies To:
                                    <select id="discountScope_${car.license_plate}">
                                        <option value="full" ${event.pricing[`${car.license_plate}_discount_scope`] === 'full' ? 'selected' : ''}>Full Price</option>
                                        <option value="basic" ${(!event.pricing[`${car.license_plate}_discount_scope`] || event.pricing[`${car.license_plate}_discount_scope`] === 'basic') ? 'selected' : ''}>Basic Price Only</option>
                                    </select>
                                </label>
                                <h6>Discount Schedule (Per Lap):</h6>
                                ${[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(laps => `
                                    <label>${laps} Lap${laps > 1 ? 's' : ''}: 
                                        <input type="number" id="discountLap_${car.license_plate}_${laps}" value="${(event.pricing[`${car.license_plate}_discount_lap_${laps}`] !== undefined ? event.pricing[`${car.license_plate}_discount_lap_${laps}`] : getDiscount(laps, 'per lap')) * 100}" min="0" max="100" step="0.1">%
                                    </label><br>
                                `).join('')}
                                <h6>Discount Schedule (Per km):</h6>
                                ${[170, 200, 250, 300, 400].map(km => `
                                    <label>${km} km: 
                                        <input type="number" id="discountKm_${car.license_plate}_${km}" value="${(event.pricing[`${car.license_plate}_discount_km_${km}`] !== undefined ? event.pricing[`${car.license_plate}_discount_km_${km}`] : getDiscount(km, 'per km')) * 100}" min="0" max="100" step="0.1">%
                                    </label><br>
                                `).join('')}
                            </div>
                            <div id="fixedLapPricing_${car.license_plate}" style="display: none;">
                                <label>Fixed Price per Lap: <input type="number" id="fixedPriceLap_${car.license_plate}" value="${event.pricing[`${car.license_plate}_fixed_price_lap`] || ''}" step="0.01"></label><br>
                            </div>
                            <div id="fixedKmPricing_${car.license_plate}" style="display: none;">
                                <label>Fixed Price per km: <input type="number" id="fixedPriceKm_${car.license_plate}" value="${event.pricing[`${car.license_plate}_fixed_price_km`] || ''}" step="0.01"></label><br>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // Add event listeners for pricing type changes
    cars.forEach(car => {
        const pricingTypeSelect = document.getElementById(`pricingType_${car.license_plate}`);
        if (pricingTypeSelect) {
            pricingTypeSelect.addEventListener('change', function() {
                const plate = car.license_plate;
                const pricingType = this.value;
                document.getElementById(`standardPricing_${plate}`).style.display = pricingType === 'standard' ? 'block' : 'none';
                document.getElementById(`fixedLapPricing_${plate}`).style.display = pricingType === 'fixed_lap' ? 'block' : 'none';
                document.getElementById(`fixedKmPricing_${plate}`).style.display = pricingType === 'fixed_km' ? 'block' : 'none';
            });
            
            // Initialize display based on current selection
            const pricingType = event.pricing[`${car.license_plate}_pricing_type`] || 'standard';
            document.getElementById(`standardPricing_${car.license_plate}`).style.display = pricingType === 'standard' ? 'block' : 'none';
            document.getElementById(`fixedLapPricing_${car.license_plate}`).style.display = pricingType === 'fixed_lap' ? 'block' : 'none';
            document.getElementById(`fixedKmPricing_${car.license_plate}`).style.display = pricingType === 'fixed_km' ? 'block' : 'none';
        }
    });

    document.getElementById('assignCarsPricingForm').style.display = 'block';
    updateSelectAllButton();
}

function toggleExpandPricing(licensePlate) {
    const details = document.getElementById(`pricingDetails_${licensePlate}`);
    const button = document.querySelector(`#pricing_${licensePlate} .expand-pricing-btn`);
    const isExpanded = details.style.display === 'none';
    details.style.display = isExpanded ? 'block' : 'none';
    button.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
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

function saveCarsPricing() {
    const event = events[currentEventIndex];
    const availableCars = [];
    
    cars.forEach(car => {
        const button = document.getElementById(`plateBtn_${car.license_plate}`);
        if (button && button.classList.contains('selected')) {
            availableCars.push(car.license_plate);
            
            const pricingType = document.getElementById(`pricingType_${car.license_plate}`).value;
            event.pricing[`${car.license_plate}_pricing_type`] = pricingType;

            if (pricingType === 'standard') {
                const basicPriceLap = document.getElementById(`basicPriceLap_${car.license_plate}`).value;
                const allIncPriceLap = document.getElementById(`allIncPriceLap_${car.license_plate}`).value;
                const basicPriceKm = document.getElementById(`basicPriceKm_${car.license_plate}`).value;
                const fuelCostKm = document.getElementById(`fuelCostKm_${car.license_plate}`).value;
                const extraDiscount = document.getElementById(`extraDiscount_${car.license_plate}`).value;
                const discountScope = document.getElementById(`discountScope_${car.license_plate}`).value;

                if (basicPriceLap !== '') event.pricing[`${car.license_plate}_basic_lap`] = parseFloat(basicPriceLap);
                if (allIncPriceLap !== '') event.pricing[`${car.license_plate}_all_inc_lap`] = parseFloat(allIncPriceLap);
                if (basicPriceKm !== '') event.pricing[`${car.license_plate}_basic_km`] = parseFloat(basicPriceKm);
                if (fuelCostKm !== '') event.pricing[`${car.license_plate}_fuel_cost_km`] = parseFloat(fuelCostKm);
                event.pricing[`${car.license_plate}_extra_discount`] = parseInt(extraDiscount) || 0;
                event.pricing[`${car.license_plate}_discount_scope`] = discountScope;

                // Save custom discounts for per lap
                [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].forEach(laps => {
                    const discountInput = document.getElementById(`discountLap_${car.license_plate}_${laps}`);
                    if (discountInput) {
                        const discountValue = parseFloat(discountInput.value) / 100;
                        event.pricing[`${car.license_plate}_discount_lap_${laps}`] = discountValue;
                    }
                });

                // Save custom discounts for per km
                [170, 200, 250, 300, 400].forEach(km => {
                    const discountInput = document.getElementById(`discountKm_${car.license_plate}_${km}`);
                    if (discountInput) {
                        const discountValue = parseFloat(discountInput.value) / 100;
                        event.pricing[`${car.license_plate}_discount_km_${km}`] = discountValue;
                    }
                });
            } else if (pricingType === 'fixed_lap') {
                const fixedPriceLap = document.getElementById(`fixedPriceLap_${car.license_plate}`).value;
                if (fixedPriceLap !== '') event.pricing[`${car.license_plate}_fixed_price_lap`] = parseFloat(fixedPriceLap);
            } else if (pricingType === 'fixed_km') {
                const fixedPriceKm = document.getElementById(`fixedPriceKm_${car.license_plate}`).value;
                if (fixedPriceKm !== '') event.pricing[`${car.license_plate}_fixed_price_km`] = parseFloat(fixedPriceKm);
            }
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
    hideAllEditForms();
}

function enterDrivenData() {
    if (typeof currentEventIndex === 'undefined' || currentEventIndex < 0 || currentEventIndex >= events.length) {
        console.error("Invalid event index:", currentEventIndex);
        alert("Please select a valid event first.");
        return;
    }

    const event = events[currentEventIndex];
    // Show the form first
    const form = document.getElementById('enterDrivenDataForm');
    hideAllEditForms(); // Hide other forms
    form.style.display = 'block'; // Ensure the form is visible

    const drivenDaySelect = document.getElementById('drivenDay');
    const dayFinishedCheckbox = document.getElementById('dayFinishedCheckbox');
    const drivenDataInputs = document.getElementById('drivenDataInputs');

    if (!drivenDaySelect || !dayFinishedCheckbox || !drivenDataInputs) {
        console.error("Required DOM elements missing for driven data entry.");
        alert("Error: Unable to load driven data section.");
        return;
    }

    // Clear existing options in the driven day select
    drivenDaySelect.innerHTML = '<option value="">Select a Day</option>';

    // Populate the driven day dropdown with event days
    event.days.forEach((day, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = day.name || `Day ${index + 1} (${day.date})`; // Improved display with date
        drivenDaySelect.appendChild(option);
    });

    // Remove any existing change listener by cloning and replacing the element
    const newSelect = drivenDaySelect.cloneNode(true);
    drivenDaySelect.parentNode.replaceChild(newSelect, drivenDaySelect);

    // Add a single change listener to update UI based on selected day
    newSelect.addEventListener('change', function() {
        const dayIndex = parseInt(this.value);
        if (dayIndex >= 0 && dayIndex < event.days.length) {
            dayFinishedCheckbox.checked = event.days[dayIndex].finished || false;
            updateDrivenDataClients();
        } else {
            dayFinishedCheckbox.checked = false;
            drivenDataInputs.innerHTML = '';
        }
    });

    // Handle "Day Finished" checkbox updates
    dayFinishedCheckbox.addEventListener('change', function() {
        const dayIndex = parseInt(newSelect.value);
        if (dayIndex >= 0 && dayIndex < event.days.length) {
            event.days[dayIndex].finished = this.checked;
            saveData();
        }
    });

    // Initial update if a day is pre-selected
    if (newSelect.value) {
        const dayIndex = parseInt(newSelect.value);
        if (dayIndex >= 0 && dayIndex < event.days.length) {
            dayFinishedCheckbox.checked = event.days[dayIndex].finished || false;
            updateDrivenDataClients();
        }
    }
}

function updateDrivenDataClients() {
    const event = events[currentEventIndex];
    const dayIndex = parseInt(document.getElementById('drivenDay').value);
    if (isNaN(dayIndex)) {
        alert("Please select a day.");
        return;
    }

    const drivenDataInputs = document.getElementById('drivenDataInputs');
    drivenDataInputs.innerHTML = '';
    
    if (dayIndex < 0 || dayIndex >= event.days.length) {
        drivenDataInputs.innerHTML = '<p>Please select a valid day.</p>';
        return;
    }

    const circuit = event.days[dayIndex].circuit;
    const unit = circuit ? (circuit.pricing_type === 'per km' ? 'km' : 'laps') : 'laps';
    
    if (!circuit) {
        drivenDataInputs.innerHTML += '<p>Warning: No circuit set for this day. Assuming laps.</p>';
    }

    event.participants.forEach((participant, participantIndex) => {
        const carsForDay = participant.car_per_day[dayIndex] || [];
        
        if (!Array.isArray(participant.driven_per_day)) {
            participant.driven_per_day = Array(event.days.length).fill().map(() => []);
        }
        if (!Array.isArray(participant.driven_per_day[dayIndex])) {
            participant.driven_per_day[dayIndex] = Array(carsForDay.length).fill(0);
        } else if (participant.driven_per_day[dayIndex].length !== carsForDay.length) {
            participant.driven_per_day[dayIndex] = Array(carsForDay.length).fill(0);
        }

        // Initialize extras if not exists
        if (!participant.extras) participant.extras = {};
        if (!participant.extras[dayIndex]) participant.extras[dayIndex] = {};

        const container = document.createElement('div');
        container.className = 'driven-data-container';
        
        // Client name
        const clientHeader = document.createElement('h4');
        clientHeader.textContent = `${participant.client.name} ${participant.client.surname}`;
        container.appendChild(clientHeader);

        if (carsForDay.length > 0) {
            carsForDay.forEach((carPlate, carIndex) => {
                const car = cars.find(c => c.license_plate === carPlate);
                const drivenValue = participant.driven_per_day[dayIndex][carIndex] || 0;
                
                const inputGroup = document.createElement('div');
                inputGroup.className = 'car-driven-input';
                
                inputGroup.innerHTML = `
                    <label>
                        ${car ? `${car.brand} ${car.model} (${carPlate})` : carPlate}:
                        <input type="number" min="0" id="drivenValue_${participantIndex}_${carIndex}" 
                               value="${drivenValue}">
                        ${unit}
                    </label>
                `;
                container.appendChild(inputGroup);
            });
        } else {
            container.innerHTML += '<p>No cars assigned for this day.</p>';
        }

        // Extras dropdown
        const extrasDropdown = document.createElement('div');
        extrasDropdown.className = 'extras-dropdown';
        extrasDropdown.innerHTML = `
            <button class="extras-dropdown-btn">Extras</button>
            <div class="extras-dropdown-content">
                <label><input type="checkbox" class="extra-checkbox" value="GoPro&Vbox"> GoPro&Vbox</label>
                <label><input type="checkbox" class="extra-checkbox" value="Instruction"> Instruction</label>
                <label><input type="checkbox" class="extra-checkbox" value="Driver&Passenger"> Driver&Passenger</label>
                <label><input type="checkbox" class="extra-checkbox" value="Misc"> Misc</label>
            </div>
        `;
        container.appendChild(extrasDropdown);

        // Existing extras for this participant/day
        const currentExtras = participant.extras[dayIndex] || {};
        for (const extraType in currentExtras) {
            if (currentExtras[extraType]) {
                const extraItem = document.createElement('div');
                extraItem.className = 'extra-item';
                
                // For Misc extras, show the custom name and price
                if (extraType.startsWith('Misc_')) {
                    const miscName = extraType.replace('Misc_', '');
                    extraItem.innerHTML = `
                        ${miscName}:
                        <input type="number" min="0" step="0.01" id="extraPrice_${participantIndex}_${dayIndex}_${extraType}" 
                               value="${currentExtras[extraType].price || 0}" placeholder="Price">
                        <button class="delete-extra-btn" onclick="this.parentElement.remove()">Delete</button>
                    `;
                } else {
                    extraItem.innerHTML = `
                        ${extraType}:
                        <input type="number" min="0" id="extraQty_${participantIndex}_${dayIndex}_${extraType}" 
                               value="${currentExtras[extraType].quantity || 1}" placeholder="Qty">
                        <input type="number" min="0" step="0.01" id="extraPrice_${participantIndex}_${dayIndex}_${extraType}" 
                               value="${currentExtras[extraType].price || 0}" placeholder="Price">
                        <button class="delete-extra-btn" onclick="this.parentElement.remove()">Delete</button>
                    `;
                }
                container.appendChild(extraItem);
            }
        }

        drivenDataInputs.appendChild(container);
    });

    // Add event listeners for extras dropdown
    document.querySelectorAll('.extras-dropdown-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const content = this.nextElementSibling;
            content.style.display = content.style.display === 'block' ? 'none' : 'block';
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function() {
        document.querySelectorAll('.extras-dropdown-content').forEach(content => {
            content.style.display = 'none';
        });
    });

    // Handle extra checkbox changes
    document.querySelectorAll('.extra-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const dropdown = this.closest('.extras-dropdown');
            const container = dropdown.closest('.driven-data-container');
            const extraType = this.value;
            const isChecked = this.checked;

            // Find participant index from the container
            const participantIndex = Array.from(container.parentNode.children).indexOf(container);

            // Add or remove extra item
            if (isChecked) {
                const extraItem = document.createElement('div');
                extraItem.className = 'extra-item';
                
                if (extraType === 'Misc') {
                    // For Misc, prompt for a name
                    const miscName = prompt("Enter name for Misc item:");
                    if (!miscName) {
                        this.checked = false;
                        return;
                    }
                    const sanitizedMiscName = 'Misc_' + miscName.replace(/[.#$/[\]]/g, '_');
                    extraItem.innerHTML = `
                        ${miscName}:
                        <input type="number" min="0" step="0.01" id="extraPrice_${participantIndex}_${dayIndex}_${sanitizedMiscName}" 
                               value="0" placeholder="Price">
                        <button class="delete-extra-btn" onclick="this.parentElement.remove()">Delete</button>
                    `;
                } else {
                    extraItem.innerHTML = `
                        ${extraType}:
                        <input type="number" min="0" id="extraQty_${participantIndex}_${dayIndex}_${extraType}" 
                               value="1" placeholder="Qty">
                        <input type="number" min="0" step="0.01" id="extraPrice_${participantIndex}_${dayIndex}_${extraType}" 
                               value="0" placeholder="Price">
                        <button class="delete-extra-btn" onclick="this.parentElement.remove()">Delete</button>
                    `;
                }
                dropdown.insertAdjacentElement('afterend', extraItem);
            } else {
                // Remove extra item if unchecked
                const extraItem = container.querySelector(`.extra-item:has(input[id^="extraQty_${participantIndex}_${dayIndex}_${extraType}"])`) || 
                                  container.querySelector(`.extra-item:has(input[id^="extraPrice_${participantIndex}_${dayIndex}_${extraType}"])`);
                if (extraItem) {
                    extraItem.remove();
                }
            }
        });
    });
}

// Add this helper function at the top of your script.js
function sanitizeFirebaseKey(key) {
    return key.replace(/[.#$/[\]]/g, '_');
}

// Then modify the saveDrivenData function to use it:
function saveDrivenData() {
    const event = events[currentEventIndex];
    const dayIndex = parseInt(document.getElementById('drivenDay').value);
    if (isNaN(dayIndex)) {
        alert("Please select a day.");
        return;
    }

    // Save the finished status
    event.days[dayIndex].finished = document.getElementById('dayFinishedCheckbox').checked;

    const participantsOnDay = event.participants.filter(p => p.car_per_day[dayIndex].length > 0);
    participantsOnDay.forEach((participant, pIndex) => {
        const carsForDay = participant.car_per_day[dayIndex];
        const drivenValues = carsForDay.map((_, carIdx) => 
            parseFloat(document.getElementById(`drivenValue_${pIndex}_${carIdx}`).value) || 0
        );

        // Save driven values
        participant.driven_per_day[dayIndex] = drivenValues;

        // Initialize extras if not exists
        if (!participant.extras) participant.extras = {};
        
        // Clear existing extras for this day
        participant.extras[dayIndex] = {};
        
        // Get all extra items for this participant/day
        const extraElements = document.querySelectorAll(`#drivenDataInputs > div:nth-child(${pIndex + 1}) .extra-item`);
        extraElements.forEach(extraElement => {
            const extraText = extraElement.textContent.trim();
            if (extraText.includes(':')) {
                const extraName = extraText.split(':')[0].trim();
                const sanitizedExtraName = sanitizeFirebaseKey(extraName);
                
                // For Misc items, we already have the custom name
                if (extraName.startsWith('Misc_')) {
                    const priceInput = extraElement.querySelector('input[type="number"]');
                    if (priceInput) {
                        const price = parseFloat(priceInput.value) || 0;
                        if (price > 0) {
                            participant.extras[dayIndex][sanitizedExtraName] = {
                                price: price,
                                originalName: extraName.replace('Misc_', '') // Store the custom name without prefix
                            };
                        }
                    }
                } else {
                    const qtyInput = extraElement.querySelector('input[type="number"]:first-of-type');
                    const priceInput = extraElement.querySelector('input[type="number"]:last-of-type');
                    if (qtyInput && priceInput) {
                        const quantity = parseInt(qtyInput.value) || 0;
                        const price = parseFloat(priceInput.value) || 0;
                        if (quantity > 0 && price > 0) {
                            participant.extras[dayIndex][sanitizedExtraName] = {
                                quantity: quantity,
                                price: price,
                                originalName: extraName
                            };
                        }
                    }
                }
            }
        });

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
    enterDrivenData();
    hideAllEditForms();
}

// Discount calculation
function getDiscount(driven, pricingType) {
    if (currentEventIndex !== null && events[currentEventIndex] && events[currentEventIndex].pricing) {
        const event = events[currentEventIndex];
        const carPlate = arguments[2]; // Optional third argument for car-specific discounts
        if (carPlate && event.pricing[`${carPlate}_pricing_type`] === 'standard') {
            if (pricingType === "per lap") {
                const customDiscount = event.pricing[`${carPlate}_discount_lap_${driven}`];
                if (customDiscount !== undefined) return customDiscount;
            } else {
                const customDiscount = event.pricing[`${carPlate}_discount_km_${driven}`];
                if (customDiscount !== undefined) return customDiscount;
            }
        }
    }
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
        uniqueCircuits.forEach(circuit => {
            const oldPackagePaid = participant.package_payment && participant.package_payment[circuit] || 0;
            const newPackagePaid = parseFloat(document.getElementById(`paid_${participantIndex}_${circuit}`).value) || 0;
            const daysForCircuit = event.days.filter(day => day.circuit && day.circuit.name === circuit).length;
            const oldPaidPerDay = daysForCircuit > 0 ? oldPackagePaid / daysForCircuit : 0;
            const newPaidPerDay = daysForCircuit > 0 ? newPackagePaid / daysForCircuit : 0;

            // Adjust paid_per_day by removing old package contribution and adding new one
            event.days.forEach((day, dayIndex) => {
                if (day.circuit && day.circuit.name === circuit) {
                    participant.paid_per_day[dayIndex] = (participant.paid_per_day[dayIndex] || 0) - oldPaidPerDay + newPaidPerDay;
                }
            });

            participant.package_payment = participant.package_payment || {};
            participant.package_payment[circuit] = newPackagePaid;
        });

        // Recalculate paid_status
        const totalPaid = participant.paid_per_day.reduce((sum, paid) => sum + paid, 0);
        const totalCreditUsed = calculateTotalCreditUsed(participant, event);
        participant.paid_status = totalPaid >= totalCreditUsed;
    });

    saveData();
    document.getElementById('clientPackageForm').style.display = 'none';
}

function calculateTotalCreditUsed(participant, event) {
    let totalCreditUsed = 0;
    const circuitGroups = {};
    
    // Group days by circuit
    event.days.forEach((day, dayIndex) => {
        if (day.circuit) {
            const circuitName = day.circuit.name;
            if (!circuitGroups[circuitName]) {
                circuitGroups[circuitName] = [];
            }
            circuitGroups[circuitName].push(dayIndex);
        }
    });
    
    // Calculate credit used for each circuit
    for (const circuitName in circuitGroups) {
        const circuit = event.days[circuitGroups[circuitName][0]].circuit;
        totalCreditUsed += calculateCircuitCredit(participant, event, circuitGroups[circuitName], circuit);
    }
    
    return totalCreditUsed;
}

function calculateCircuitCredit(participant, event, trackDayIndices, circuit) {
    if (!circuit) return 0;

    const usageGroups = {};
    let totalExtras = 0;
    
    trackDayIndices.forEach(dayIndex => {
        const carsForDay = participant.car_per_day[dayIndex] || [];
        const drivenForDay = (participant.driven_per_day && participant.driven_per_day[dayIndex]) || [];

        // Calculate extras for this day
        if (participant.extras && participant.extras[dayIndex]) {
            for (const extraType in participant.extras[dayIndex]) {
                const extra = participant.extras[dayIndex][extraType];
                if (extra && extra.price > 0) {
                    totalExtras += extra.price * (extra.quantity || 1);
                }
            }
        }

        carsForDay.forEach((carPlate, carIdx) => {
            if (carPlate) {
                const car = cars.find(c => c.license_plate === carPlate);
                if (!car) return;
                const modelKey = `${car.brand} ${car.model}`;
                const packageType = (participant.package_per_day[dayIndex] && participant.package_per_day[dayIndex][carIdx]) || 'basic';
                const key = `${modelKey}_${packageType}_${circuit.name}`;
                if (!usageGroups[key]) {
                    usageGroups[key] = { driven: 0, pricing: car, package: packageType };
                }
                usageGroups[key].driven += drivenForDay[carIdx] || 0;
            }
        });
    });

    let totalCost = 0;
    for (const key in usageGroups) {
        const group = usageGroups[key];
        const driven = group.driven;
        let carCost = 0;

        const pricing = event.pricing || {};
        const pricingType = pricing[`${group.pricing.license_plate}_pricing_type`] || 'standard';

        if (pricingType === 'fixed_km' && group.package === 'fixed' && circuit.pricing_type === "per km") {
            // Fixed price per km calculation
            const fixedPricePerKm = pricing[`${group.pricing.license_plate}_fixed_price_km`] || 0;
            carCost = driven * fixedPricePerKm;
        } else if (pricingType === 'fixed_lap' && group.package === 'fixed' && circuit.pricing_type === "per lap") {
            // Fixed price per lap calculation
            const fixedPricePerLap = pricing[`${group.pricing.license_plate}_fixed_price_lap`] || 0;
            carCost = driven * fixedPricePerLap;
        } else {
            // Standard calculation (existing logic)
            if (circuit.pricing_type === "per lap") {
                const basicCostPerLap = pricing[`${group.pricing.license_plate}_basic_lap`] || group.pricing.basic_price_lap || 0;
                const allIncCostPerLap = pricing[`${group.pricing.license_plate}_all_inc_lap`] || group.pricing.all_inc_price_lap || 0;
                const extraDiscount = (pricing[`${group.pricing.license_plate}_extra_discount`] || 0) / 100;
                const discountScope = pricing[`${group.pricing.license_plate}_discount_scope`] || 'basic';
                
                let discount = getDiscount(driven, "per lap");
                let discountedBasicCost = basicCostPerLap * (1 - discount);
                
                // Apply extra discount
                if (discountScope === 'basic') {
                    discountedBasicCost = discountedBasicCost * (1 - extraDiscount);
                }
                
                carCost = driven * discountedBasicCost;
                
                if (group.package === "fuel_inc") {
                    carCost += driven * (allIncCostPerLap - 35);
                } else if (group.package === "all_inc") {
                    carCost += driven * allIncCostPerLap;
                }
                
                // Apply extra discount to full price if scope is 'full'
                if (discountScope === 'full') {
                    carCost = carCost * (1 - extraDiscount);
                }
            } else {
                // Per km calculation
                const basicCostPerKm = pricing[`${group.pricing.license_plate}_basic_km`] || group.pricing.basic_price_km || 0;
                const fuelCostPerKm = pricing[`${group.pricing.license_plate}_fuel_cost_km`] || group.pricing.fuel_cost_km || 0;
                const extraDiscount = (pricing[`${group.pricing.license_plate}_extra_discount`] || 0) / 100;
                const discountScope = pricing[`${group.pricing.license_plate}_discount_scope`] || 'basic';
                
                let discount = getDiscount(driven, "per km");
                let discountedBasicCost = basicCostPerKm * (1 - discount);
                
                // Apply extra discount
                if (discountScope === 'basic') {
                    discountedBasicCost = discountedBasicCost * (1 - extraDiscount);
                }
                
                carCost = driven * discountedBasicCost;
                
                if (group.package === "fuel_inc" || group.package === "all_inc") {
                    let baseFuelCost = circuit.name === "Spa" || circuit.name === "Nürburgring GP Track"
                        ? Math.round(fuelCostPerKm * 10) / 10
                        : Math.round((fuelCostPerKm * 1.3) * 10) / 10;
                    carCost += driven * baseFuelCost;
                }
                
                // Apply extra discount to full price if scope is 'full'
                if (discountScope === 'full') {
                    carCost = carCost * (1 - extraDiscount);
                }
            }
        }
        totalCost += carCost;
    }

    return Math.round(totalCost + totalExtras);
}


function viewEvent(index) {
    hideAllEditForms();
    currentEventIndex = index;
    const event = events[currentEventIndex];
    const header = document.getElementById('overviewTableHeader');
    const tbody = document.getElementById('overviewTableBody');

    const circuitGroups = {};
    // Track which days have extras
    const daysWithExtras = new Set();
    
    const circuitColors = {
        'N/A': '#A9A9A9',
        'Spa': '#87CEEB',
        'Nürburgring GP Track': '#98FB98',
        'Nurburgring Nordschleife': '#FF9999',
    };

    event.days.forEach((day, dayIndex) => {
        const circuitName = day.circuit ? day.circuit.name : 'N/A';
        if (!circuitGroups[circuitName]) {
            circuitGroups[circuitName] = { days: [], pricingType: day.circuit ? day.circuit.pricing_type : 'N/A' };
        }
        circuitGroups[circuitName].days.push({ index: dayIndex, date: day.date });
        
        // Check if any participant has extras for this day
        if (event.participants.some(p => p.extras && p.extras[dayIndex] && Object.keys(p.extras[dayIndex]).length > 0)) {
            daysWithExtras.add(dayIndex);
        }
    });

    // Rest of the function remains the same until the header construction
    let headerRows = [[], []];
    headerRows[0].push({ content: 'Customer', colSpan: 1, rowSpan: 2 });

    let currentColIndex = 1;
    Object.entries(circuitGroups).forEach(([circuitName, group], idx) => {
        const dayCount = group.days.length;
        const hasMultipleDays = dayCount > 1;
        const isSingleTrack = Object.keys(circuitGroups).length === 1;
        
        const baseCols = 1 + dayCount;
        const usageCols = hasMultipleDays ? dayCount + 1 : 1;
        const summaryCols = isSingleTrack ? 0 : 2;
        // Calculate extras columns only for days that have extras
        const extrasCols = group.days.filter(d => daysWithExtras.has(d.index)).length;
        const totalCircuitCols = baseCols + usageCols + summaryCols + extrasCols;

        const headerColor = circuitColors[circuitName] || `hsl(${idx * 60}, 50%, 80%)`;
        headerRows[0].push({ 
            content: circuitName, 
            colSpan: totalCircuitCols,
            styles: { 
                halign: 'center', 
                backgroundColor: headerColor,
                borderRight: idx < Object.keys(circuitGroups).length - 1 ? '2px solid #000' : 'none'
            } 
        });

        headerRows[1].push({ content: 'Paid Track', styles: { halign: 'center', backgroundColor: headerColor } });
        group.days.forEach(day => {
            headerRows[1].push({ 
                content: `Car Used (${day.date})`, 
                styles: { halign: 'center', backgroundColor: headerColor } 
            });
            // Only add extras column if this day has extras
            if (daysWithExtras.has(day.index)) {
                headerRows[1].push({ 
                    content: `Extras (${day.date})`, 
                    styles: { halign: 'center', backgroundColor: headerColor } 
                });
            }
            if (hasMultipleDays) {
                headerRows[1].push({ 
                    content: `${group.pricingType === 'per lap' ? 'Laps' : 'Km'} (${day.date})`, 
                    styles: { halign: 'center', backgroundColor: headerColor } 
                });
            }
        });
        if (!isSingleTrack) {
            headerRows[1].push({ content: `Total ${group.pricingType === 'per lap' ? 'Laps' : 'Km'}`, styles: { halign: 'center', backgroundColor: headerColor } });
            headerRows[1].push({ content: 'Credit Used', styles: { halign: 'center', backgroundColor: headerColor } });
            headerRows[1].push({ content: 'Balance Track', styles: { halign: 'center', backgroundColor: headerColor } });
        } else {
            headerRows[1].push({ content: `Total ${group.pricingType === 'per lap' ? 'Laps' : 'Km'}`, styles: { halign: 'center', backgroundColor: headerColor } });
        }

        currentColIndex += totalCircuitCols;
    });

    headerRows[0].push({ 
        content: 'Summary', 
        colSpan: 4, 
        styles: { 
            halign: 'center', 
            backgroundColor: '#D3D3D3', 
            borderLeft: '2px solid #000'
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

    tbody.innerHTML = '';
    event.participants.forEach(participant => {
        const row = document.createElement('tr');
        let rowHTML = `<td>${participant.client.name} ${participant.client.surname}</td>`;
        let totalPaid = 0;
        let totalCreditUsed = 0;
        const isSingleTrack = Object.keys(circuitGroups).length === 1;

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
                
                // Only add extras column if this day has extras
                if (daysWithExtras.has(day.index)) {
                    let extrasText = '';
                    if (participant.extras && participant.extras[day.index]) {
                        const extras = participant.extras[day.index];
                        const extrasList = [];
                        let totalExtras = 0;
                        
                        for (const extraKey in extras) {
                            const extra = extras[extraKey];
                            if (extra && extra.price > 0) {
                                // Use originalName if available (for Misc items)
                                const extraType = extra.originalName || extraKey.replace(/_/g, ' ');
                                const qty = extra.quantity || 1;
                                const price = extra.price;
                                extrasList.push(`${extraType} (${qty})`);
                                totalExtras += qty * price;
                            }
                        }
                        
                        if (extrasList.length > 0) {
                            extrasText = `${extrasList.join(', ')} = €${Math.round(totalExtras)}`;
                        }
                    }
                    rowHTML += `<td>${extrasText || '-'}</td>`;
                }
                
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
            
            if (!isSingleTrack) {
                rowHTML += `<td>€${Math.round(circuitCreditUsed)}</td>`;
                const balanceTrack = Math.round(paidTrack - circuitCreditUsed);
                rowHTML += `<td style="background-color: ${balanceTrack < 0 ? '#FF9999' : 'inherit'}">€${balanceTrack}</td>`;
            }
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
    document.querySelector('#overviewForm h2').textContent = 'Event Overview';
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

    // Check if any participant has extras
    const hasExtras = event.participants.some(p => p.extras && Object.keys(p.extras).length > 0);

    let headers = [[], []];
    headers[0].push({ content: 'Customer', colSpan: 1, rowSpan: 2 });

    const isSingleTrack = Object.keys(circuitGroups).length === 1;

    Object.entries(circuitGroups).forEach(([circuitName, group], idx) => {
        const dayCount = group.days.length;
        const hasMultipleDays = dayCount > 1;
        const baseCols = 1 + dayCount;
        const usageCols = hasMultipleDays ? dayCount + 1 : 1;
        const summaryCols = isSingleTrack ? 0 : 2;
        const extrasCols = hasExtras ? dayCount : 0;
        const totalCircuitCols = baseCols + usageCols + summaryCols + extrasCols;

        headers[0].push({ content: circuitName, colSpan: totalCircuitCols });
        headers[1].push('Paid Track');
        group.days.forEach(day => {
            const formattedDate = new Date(day.date).toLocaleString('en-US', { month: 'short', day: 'numeric' });
            headers[1].push(`Car Used (${formattedDate})`);
            if (hasExtras) {
                headers[1].push(`Extras (${formattedDate})`);
            }
            if (hasMultipleDays) headers[1].push(`${group.pricingType === 'per lap' ? 'Laps' : 'Km'} (${formattedDate})`);
        });
        headers[1].push(`Total ${group.pricingType === 'per lap' ? 'Laps' : 'Km'}`);
        if (!isSingleTrack) {
            headers[1].push('Credit Used');
            headers[1].push('Balance Track');
        }
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

                // Add extras column
                if (hasExtras) {
                    let extrasText = '';
                    if (participant.extras && participant.extras[day.index]) {
                        const extras = participant.extras[day.index];
                        const extrasList = [];
                        let totalExtras = 0;
                        
                        for (const extraType in extras) {
                            if (extras[extraType] && extras[extraType].price > 0) {
                                // Use originalName if available (for Misc items)
                                const displayName = extras[extraType].originalName || extraType.replace(/_/g, ' ');
                                const qty = extras[extraType].quantity || 1;
                                const price = extras[extraType].price;
                                extrasList.push(`${displayName} (${qty})`);
                                totalExtras += qty * price;
                            }
                        }
                        
                        if (extrasList.length > 0) {
                            extrasText = `${extrasList.join(', ')} = €${Math.round(totalExtras)}`;
                        }
                    }
                    row.push(extrasText || '-');
                    colIndex++;
                }

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

            if (!isSingleTrack) {
                row.push(`€${Math.round(circuitCreditUsed)}`);
                colIndex++;
                const balanceTrack = Math.round(paidTrack - circuitCreditUsed);
                row.push(`€${balanceTrack}`);
                if (balanceTrack < 0) columnStyles[colIndex] = { fillColor: [255, 153, 153] };
                colIndex++;
            }
        });

        row.push(`€${Math.round(totalPaid)}`);
        colIndex++;
        row.push(`€${Math.round(totalCreditUsed)}`);
        colIndex++;
        const finalBalance = Math.round(totalPaid - totalCreditUsed);
        row.push(`€${finalBalance}`);
        if (finalBalance < 0) {
            columnStyles[colIndex] = { fillColor: [255, 153, 153] };
        } else if (finalBalance > 0) {
            columnStyles[colIndex] = { fillColor: [144, 238, 144] };
        }
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
        headStyles: { fillColor: [26, 42, 68] },
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
                    let colIdx = 1;
                    Object.entries(circuitGroups).forEach(([circuitName], idx) => {
                        const totalCols = headers[0][idx + 1].colSpan;
                        if (data.column.index >= colIdx && data.column.index < colIdx + totalCols) {
                            data.cell.styles.fillColor = circuitColors[circuitName] || [Math.min(200, 150 + idx * 20), 200, 200];
                        }
                        colIdx += totalCols;
                    });
                    if (data.column.index >= colIdx) {
                        data.cell.styles.fillColor = [211, 211, 211];
                    }
                }
            }
        },
        didDrawCell: function(data) {
            if (data.section === 'head' && data.row.index === 0) {
                const circuitIndex = Object.keys(circuitGroups).findIndex(name => data.cell.text[0] === name);
                if (circuitIndex >= 0 && circuitIndex < Object.keys(circuitGroups).length - 1) {
                    const x = data.cell.x + data.cell.width;
                    doc.setDrawColor(0);
                    doc.setLineWidth(0.5);
                    doc.line(x, data.cell.y, x, data.cell.y + data.cell.height * 2);
                } else if (data.cell.text[0] === 'Summary') {
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

    // Rest of the PDF generation remains the same...
    doc.addPage('portrait');
    doc.setFontSize(14);
    doc.text(`Payment Details - ${event.name}`, 10, 10);

    const margin = 5;
    const pageWidth = doc.internal.pageSize.width - margin * 2;

    let paymentData = [];
    let totalPayments = 0;

    event.participants.forEach(participant => {
        const clientName = `${participant.client.name} ${participant.client.surname}`;

        if (participant.package_payment) {
            Object.entries(participant.package_payment).forEach(([circuit, amount]) => {
                if (amount !== 0) {
                    paymentData.push([
                        clientName,
                        `€${Math.round(amount)}`,
                        'Package',
                        circuit,
                        '',
                        'Initial package'
                    ]);
                    totalPayments += amount;
                }
            });
        }

        if (participant.payment_details?.length > 0) {
            participant.payment_details.forEach(payment => {
                paymentData.push([
                    clientName,
                    `€${Math.round(payment.amount)}`,
                    payment.method,
                    payment.circuit || 'All',
                    payment.date,
                    payment.observation || ''
                ]);
                totalPayments += payment.amount;
            });
        }

        // Add extras to payment details
        if (participant.extras) {
            for (const dayIndex in participant.extras) {
                const dayExtras = participant.extras[dayIndex];
                for (const extraType in dayExtras) {
                    const extra = dayExtras[extraType];
                    if (extra && extra.price > 0) {
                        const day = event.days[dayIndex];
                        const circuitName = day.circuit ? day.circuit.name : 'N/A';
                        const total = (extra.quantity || 1) * extra.price;
                        paymentData.push([
                            clientName,
                            `€${Math.round(total)}`,
                            'Extra',
                            circuitName,
                            day.date,
                            `${extraType} (${extra.quantity || 1})`
                        ]);
                        totalPayments += total;
                    }
                }
            }
        }
    });

    const colWidths = {
        0: pageWidth * 0.25,
        1: pageWidth * 0.15,
        2: pageWidth * 0.12,
        3: pageWidth * 0.15,
        4: pageWidth * 0.13,
        5: pageWidth * 0.20
    };

    doc.autoTable({
        startY: 15,
        head: [['Customer', 'Amount', 'Type', 'Circuit', 'Date', 'Observation']],
        body: paymentData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [26, 42, 68], fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'right' },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'center' },
            5: { halign: 'left' }
        },
        margin: { top: margin, left: margin, right: margin, bottom: margin },
        willDrawCell: function(data) {
            if (data.column.index === 1 && data.section === 'body') {
                const amount = parseFloat(data.cell.text[0].replace('€', '').replace(',', ''));
                if (amount < 0) {
                    doc.setFillColor(255, 153, 153);
                    doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                    doc.setTextColor(0, 0, 0);
                }
            }
        },
        didDrawPage: function(data) {
            if (data.pageCount === data.pageNumber) {
                const totalY = doc.internal.pageSize.height - margin;
                const totalText = `Total Payments: €${Math.round(totalPayments)}`;
                
                if (totalPayments < 0) {
                    const textWidth = doc.getStringUnitWidth(totalText) * doc.internal.getFontSize() / doc.internal.scaleFactor;
                    doc.setFillColor(255, 153, 153);
                    doc.rect(margin, totalY - 6, textWidth + 4, 6, 'F');
                }
                
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(9);
                doc.text(totalText, margin, totalY);
            }
        }
    });

    doc.save(`Event_Overview_${event.name}.pdf`);
}

function showRemainingPackage() {
    hideAllEditForms();
    const event = events[currentEventIndex];
    const header = document.getElementById('overviewTableHeader');
    const tbody = document.getElementById('overviewTableBody');

    // Group days by circuit
    const circuitGroups = {};
    event.days.forEach((day, dayIndex) => {
        const circuitName = day.circuit ? day.circuit.name : 'N/A';
        if (!circuitGroups[circuitName]) {
            circuitGroups[circuitName] = { 
                days: [], 
                pricingType: day.circuit ? day.circuit.pricing_type : 'N/A',
                unit: day.circuit ? (day.circuit.pricing_type === 'per km' ? 'km' : 'laps') : 'laps'
            };
        }
        circuitGroups[circuitName].days.push({ 
            index: dayIndex, 
            date: day.date,
            finished: day.finished || false
        });
    });

    // Circuit colors (same as in View Event)
    const circuitColors = {
        'N/A': '#A9A9A9',
        'Spa': '#87CEEB',
        'Nürburgring GP Track': '#98FB98',
        'Nurburgring Nordschleife': '#FF9999',
    };

    // Build header
    let headerRows = [[], []];
    headerRows[0].push({ content: 'Customer', colSpan: 1, rowSpan: 2 });

    // Add circuit headers
    Object.entries(circuitGroups).forEach(([circuitName, group], idx) => {
        const dayCount = group.days.length;
        const totalCols = dayCount;
        
        // Top header with circuit name
        headerRows[0].push({ 
            content: circuitName, 
            colSpan: totalCols,
            styles: { 
                halign: 'center', 
                backgroundColor: circuitColors[circuitName] || `hsl(${idx * 60}, 50%, 80%)`,
                borderRight: idx < Object.keys(circuitGroups).length - 1 ? '2px solid #000' : 'none'
            }
        });

        // Subheaders with dates
        group.days.forEach(day => {
            headerRows[1].push({ 
                content: formatDate(day.date), 
                styles: { 
                    halign: 'center', 
                    backgroundColor: circuitColors[circuitName] || `hsl(${idx * 60}, 50%, 80%)`
                }
            });
        });
    });

    // Build the header HTML
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

    // Build the table body
    tbody.innerHTML = '';
    event.participants.forEach((participant, participantIndex) => {
        const row = document.createElement('tr');
        let rowHTML = `<td>${participant.client.name} ${participant.client.surname}</td>`;

        // For each circuit group
        Object.entries(circuitGroups).forEach(([circuitName, group]) => {
            // Calculate total credit used and paid for this circuit
            const trackDayIndices = group.days.map(d => d.index);
            const circuit = event.days[trackDayIndices[0]].circuit;
            const paidTrack = trackDayIndices.reduce((sum, idx) => sum + (participant.paid_per_day[idx] || 0), 0);
            const circuitCreditUsed = calculateCircuitCredit(participant, event, trackDayIndices, circuit);
            const balanceTrack = paidTrack - circuitCreditUsed;

            // For each day in this circuit
            group.days.forEach(day => {
                const dayIndex = day.index;
                const carsForDay = participant.car_per_day[dayIndex] || [];
                const packagesForDay = participant.package_per_day[dayIndex] || [];
                const drivenForDay = participant.driven_per_day[dayIndex] || [];
                
                let dayContent = '';
                
                if (day.finished) {
                    // Day is finished - show what was driven, grouped by model/package
                    const modelPackageMap = new Map();
                    
                    carsForDay.forEach((carPlate, carIdx) => {
                        const car = cars.find(c => c.license_plate === carPlate);
                        if (car) {
                            const carModel = `${car.brand} ${car.model}`;
                            const packageType = packagesForDay[carIdx] || 'basic';
                            const driven = drivenForDay[carIdx] || 0;
                            
                            const key = `${carModel}_${packageType}`;
                            if (!modelPackageMap.has(key)) {
                                modelPackageMap.set(key, { carModel, packageType, driven: 0 });
                            }
                            modelPackageMap.get(key).driven += driven;
                        }
                    });
                    
                    // Generate content for each model/package combination
                    modelPackageMap.forEach(({ carModel, packageType, driven }) => {
                        dayContent += `${carModel}: Finished ${driven} ${group.unit} (${packageType})<br>`;
                    });

                    // Show extras for finished day
                    if (participant.extras && participant.extras[dayIndex]) {
                        const extras = participant.extras[dayIndex];
                        let extrasText = '';
                        let totalExtras = 0;
                        
                        for (const extraType in extras) {
                            if (extras[extraType] && extras[extraType].price > 0) {
                                const qty = extras[extraType].quantity || 1;
                                const price = extras[extraType].price;
                                extrasText += `${extraType} (${qty}) = €${Math.round(qty * price)}<br>`;
                                totalExtras += qty * price;
                            }
                        }
                        
                        if (extrasText) {
                            dayContent += `<strong>Extras:</strong><br>${extrasText}`;
                        }
                    }
                } else {
                    // Day is not finished - calculate remaining
                    if (balanceTrack < 1) {
                        dayContent = `0 (No credit)`;
                    } else {
                        // Group cars by model/package
                        const modelPackageMap = new Map();
                        
                        carsForDay.forEach((carPlate, carIdx) => {
                            const car = cars.find(c => c.license_plate === carPlate);
                            if (car) {
                                const carModel = `${car.brand} ${car.model}`;
                                const packageType = packagesForDay[carIdx] || 'basic';
                                const key = `${carModel}_${packageType}`;
                                
                                if (!modelPackageMap.has(key)) {
                                    modelPackageMap.set(key, { 
                                        carModel, 
                                        packageType,
                                        lapsAvailable: 0,
                                        lapsDriven: 0
                                    });
                                }
                            }
                        });
                        
                        // Calculate totals for each model/package
                        modelPackageMap.forEach((value, key) => {
                            const lapsAvailable = LapsAvailableModel(participant, event, circuitName, value.carModel, value.packageType);
                            const lapsDriven = TotalLapsModel(participant, event, circuitName, value.carModel, value.packageType);
                            value.lapsAvailable = lapsAvailable;
                            value.lapsDriven = lapsDriven;
                        });
                        
                        // Calculate remaining per day
                        const unfinishedDays = group.days.filter(d => !d.finished).length;
                        
                        // Generate content for each model/package
                        modelPackageMap.forEach(({ carModel, packageType, lapsAvailable, lapsDriven }) => {
                            const totalRemaining = lapsAvailable - lapsDriven;
                            const remainingPerDay = unfinishedDays > 0 ? Math.floor(totalRemaining / unfinishedDays) : 0;
                            
                            if (remainingPerDay >= 1) {
                                dayContent += `${carModel}: Remaining ${remainingPerDay} ${group.unit} (${packageType})<br>`;
                            } else {
                                dayContent += `${carModel}: 0 (No credit) (${packageType})<br>`;
                            }
                        });
                    }
                }
                
                rowHTML += `<td>${dayContent || 'N/A'}</td>`;
            });
        });
        rowHTML += `<td><button onclick="openParticipantOverview(${currentEventIndex}, ${participantIndex})">Participant Overview</button></td>`;
        row.innerHTML = rowHTML;
        tbody.appendChild(row);
    });

    // Update the form title and buttons
    document.querySelector('#overviewForm h2').textContent = 'Remaining Package';
    document.getElementById('overviewForm').style.display = 'block';
}

function openParticipantOverview(eventIndex, participantIndex) {
    const eventId = eventIndex; // Assuming eventIndex is the Firebase event ID
    const participantId = participantIndex; // Assuming participantIndex is the participant ID in the event's participants object
    
    // Generate URL with eventId and participantId
    const url = `https://rsr-event-management.netlify.app/participant-overview.html?eventId=${eventId}&participantId=${participantId}`;
    
    // Open the URL in a new window
    window.open(url, '_blank', 'width=600,height=400');
}

function calculateRemainingForDay(event, participant, dayIndex) {
    const circuit = event.days[dayIndex].circuit;
    if (!circuit) return 0;
    
    const circuitName = circuit.name;
    const trackDayIndices = event.days
        .map((d, idx) => d.circuit && d.circuit.name === circuitName ? idx : -1)
        .filter(idx => idx !== -1);
    
    const carPlate = participant.car_per_day[dayIndex]?.[0];
    if (!carPlate) return 0;
    
    const car = cars.find(c => c.license_plate === carPlate);
    const packageType = participant.package_per_day[dayIndex]?.[0] || 'basic';
    
    const totalAvailable = LapsAvailableModel(participant, event, circuitName, `${car.brand} ${car.model}`, packageType);
    const totalUsed = TotalLapsModel(participant, event, circuitName, `${car.brand} ${car.model}`, packageType);
    
    const unfinishedDays = trackDayIndices.filter(idx => !event.days[idx].finished).length;
    return unfinishedDays > 0 ? Math.floor((totalAvailable - totalUsed) / unfinishedDays) : 0;
}

function CreditUsedModel(participant, event, circuitName, carModel, packageType) {
    const trackDayIndices = event.days
        .map((day, idx) => day.circuit && day.circuit.name === circuitName ? idx : -1)
        .filter(idx => idx !== -1);
    const circuit = event.days[trackDayIndices[0]]?.circuit;
    if (!circuit) return 0;

    let totalCredit = 0;
    const pricing = event.pricing || {};

    trackDayIndices.forEach(dayIdx => {
        const carsForDay = participant.car_per_day[dayIdx] || [];
        const packagesForDay = participant.package_per_day[dayIdx] || [];
        const drivenForDay = participant.driven_per_day[dayIdx] || [];

        carsForDay.forEach((plate, carIdx) => {
            const car = cars.find(c => c.license_plate === plate);
            if (!car || `${car.brand} ${car.model}` !== carModel || packagesForDay[carIdx] !== packageType) return;

            const driven = drivenForDay[carIdx] || 0;
            if (driven <= 0) return;

            const pricingType = pricing[`${plate}_pricing_type`] || 'standard';
            const extraDiscount = (pricing[`${plate}_extra_discount`] || 0) / 100;
            const discountScope = pricing[`${plate}_discount_scope`] || 'basic';

            let cost = 0;
            if (pricingType === 'fixed' && packageType === 'fixed' && circuit.pricing_type === 'per lap') {
                const fixedPriceLap = pricing[`${plate}_fixed_price_lap`] || 0;
                cost = fixedPriceLap * driven;
            } else {
                const discount = getDiscount(driven, circuit.pricing_type);
                if (circuit.pricing_type === 'per lap') {
                    const basicPriceLap = pricing[`${plate}_basic_lap`] !== undefined ? pricing[`${plate}_basic_lap`] : car.basic_price_lap;
                    const allIncPriceLap = pricing[`${plate}_all_inc_lap`] !== undefined ? pricing[`${plate}_all_inc_lap`] : car.all_inc_price_lap;
                    let baseCost = basicPriceLap * driven * (1 - discount);

                    if (packageType === 'basic') {
                        cost = baseCost;
                    } else if (packageType === 'fuel_inc') {
                        cost = baseCost + (allIncPriceLap - 35) * driven;
                    } else if (packageType === 'all_inc') {
                        cost = baseCost + allIncPriceLap * driven;
                    }
                    if (extraDiscount > 0) {
                        cost = discountScope === 'full' ? cost * (1 - extraDiscount) : baseCost * (1 - extraDiscount) + (cost - baseCost);
                    }
                } else if (circuit.pricing_type === 'per km') {
                    const basicPriceKm = pricing[`${plate}_basic_km`] !== undefined ? pricing[`${plate}_basic_km`] : car.basic_price_km;
                    const fuelCostKm = pricing[`${plate}_fuel_cost_km`] !== undefined ? pricing[`${plate}_fuel_cost_km`] : car.fuel_cost_km;
                    let baseCost = basicPriceKm * driven * (1 - discount);

                    if (packageType === 'basic') {
                        cost = baseCost;
                    } else if (packageType === 'fuel_inc') {
                        const fuelMultiplier = (circuitName === 'Nurburgring Nordschleife' || circuitName === 'Spa' || circuitName === 'Nürburgring GP Track') ? 1 : 1.3;
                        cost = baseCost + (fuelCostKm * fuelMultiplier * driven);
                    }
                    if (extraDiscount > 0) {
                        cost = discountScope === 'full' ? cost * (1 - extraDiscount) : baseCost * (1 - extraDiscount) + (cost - baseCost);
                    }
                }
            }
            totalCredit += cost;
        });
    });

    return Math.round(totalCredit);
}

function TotalCreditModel(participant, event, circuitName, carModel, packageType) {
    const circuit = circuits.find(c => c.name === circuitName);
    if (!circuit) return 0;

    const trackDayIndices = event.days
        .map((day, idx) => day.circuit && day.circuit.name === circuitName ? idx : -1)
        .filter(idx => idx !== -1);
    if (!trackDayIndices.length) return 0;

    const car = cars.find(c => `${c.brand} ${c.model}` === carModel);
    if (!car) return 0;

    const pricing = event.pricing || {};
    const pricingType = pricing[`${car.license_plate}_pricing_type`] || 'standard';
    const isSpaOrNurburgring = circuitName === 'Spa' || circuitName.includes('Nürburgring');

    // Initialize total credit
    let totalCredit = participant.package_payment && participant.package_payment[circuitName] || 0;

    // Add extra payments for this circuit
    if (participant.payment_details) {
        participant.payment_details.forEach(payment => {
            if (payment.circuit === circuitName || payment.circuit === 'All') {
                totalCredit += payment.amount;
            }
        });
    }

    // For fixed pricing, adjust credit calculation if circuit is per lap
    if (pricingType === 'fixed' && circuit.pricing_type === 'per lap' && packageType === 'fixed') {
        const fixedPriceLap = pricing[`${car.license_plate}_fixed_price_lap`] || 0;
        if (fixedPriceLap > 0) {
            // Total credit is simply the sum of payments, as it's used directly with fixed price
            return Math.max(0, totalCredit);
        }
    }

    // Standard pricing: total credit is the sum of package and extra payments
    return Math.max(0, totalCredit);
}

function LapsAvailableModel(participant, event, circuitName, carModel, packageType) {
    const totalCredit = TotalCreditModel(participant, event, circuitName, carModel, packageType);
    const circuit = circuits.find(c => c.name === circuitName);
    if (!circuit) return 0; // No circuit, no calculation

    // Check if any car of this model has fixed pricing
    const carsOfModel = cars.filter(c => `${c.brand} ${c.model}` === carModel);
    const fixedLapPricingCar = carsOfModel.find(car => {
        const plate = car.license_plate;
        return event.pricing && event.pricing[`${plate}_pricing_type`] === 'fixed_lap';
    });
    const fixedKmPricingCar = carsOfModel.find(car => {
        const plate = car.license_plate;
        return event.pricing && event.pricing[`${plate}_pricing_type`] === 'fixed_km';
    });

    // If any car of this model has fixed lap pricing and package is fixed, and circuit is per lap
    if (fixedLapPricingCar && packageType === 'fixed' && circuit.pricing_type === 'per lap') {
        const plate = fixedLapPricingCar.license_plate;
        const fixedPriceLap = event.pricing[`${plate}_fixed_price_lap`] || 0;
        return fixedPriceLap > 0 ? Math.floor(totalCredit / fixedPriceLap) : 0;
    }

    // If any car of this model has fixed km pricing and package is fixed, and circuit is per km
    if (fixedKmPricingCar && packageType === 'fixed' && circuit.pricing_type === 'per km') {
        const plate = fixedKmPricingCar.license_plate;
        const fixedPriceKm = event.pricing[`${plate}_fixed_price_km`] || 0;
        return fixedPriceKm > 0 ? Math.floor(totalCredit / fixedPriceKm) : 0;
    }

    // Get a representative car for pricing defaults
    const car = cars.find(c => `${c.brand} ${c.model}` === carModel);
    if (!car) return 0;

    const pricing = event.pricing || {};
    const plate = car.license_plate; // Use the first car of this model for pricing
    const pricingType = pricing[`${plate}_pricing_type`] || 'standard';
    const unit = circuit.pricing_type === 'per km' ? 'km' : 'laps';
    const isSpaOrNurburgring = circuitName === 'Nurburgring Nordschleife' || circuitName === 'Spa' || circuitName === 'Nürburgring GP Track';

    // Pricing values with event overrides
    const basicPriceLap = pricing[`${plate}_basic_lap`] !== undefined ? pricing[`${plate}_basic_lap`] : car.basic_price_lap;
    const allIncPriceLap = pricing[`${plate}_all_inc_lap`] !== undefined ? pricing[`${plate}_all_inc_lap`] : car.all_inc_price_lap;
    const basicPriceKm = pricing[`${plate}_basic_km`] !== undefined ? pricing[`${plate}_basic_km`] : car.basic_price_km;
    const fuelCostKm = pricing[`${plate}_fuel_cost_km`] !== undefined ? pricing[`${plate}_fuel_cost_km`] : car.fuel_cost_km;
    const extraDiscount = (pricing[`${plate}_extra_discount`] || 0) / 100;
    const discountScope = pricing[`${plate}_discount_scope`] || 'basic';

    // Calculate the maximum affordable units (laps or km)
    let units = 0;
    let totalCost = 0;
    
    while (true) {
        const nextUnits = units + 1;
        let costForNextUnit = 0;
        
        // Calculate cost for next unit
        if (unit === 'laps') {
            const discount = getDiscount(nextUnits, "per lap");
            let baseCost = basicPriceLap * nextUnits * (1 - discount);
            
            if (packageType === 'basic') {
                costForNextUnit = baseCost;
            } else if (packageType === 'fuel_inc') {
                costForNextUnit = baseCost + (allIncPriceLap - 35) * nextUnits;
            } else if (packageType === 'all_inc') {
                costForNextUnit = baseCost + allIncPriceLap * nextUnits;
            }
            
            // Apply extra discount
            if (extraDiscount > 0) {
                if (discountScope === 'full') {
                    costForNextUnit *= (1 - extraDiscount);
                } else {
                    baseCost *= (1 - extraDiscount);
                    costForNextUnit = packageType === 'basic' ? baseCost : 
                                      (packageType === 'fuel_inc' ? baseCost + (allIncPriceLap - 35) * nextUnits : 
                                      baseCost + allIncPriceLap * nextUnits);
                }
            }
        } 
        else { // per km
            const discount = getDiscount(nextUnits, "per km");
            let baseCost = basicPriceKm * nextUnits * (1 - discount);
            
            if (packageType === 'basic') {
                costForNextUnit = baseCost;
            } else if (packageType === 'fuel_inc') {
                const fuelMultiplier = isSpaOrNurburgring ? 1 : 1.3;
                const baseFuelCost = Math.round(fuelCostKm * 10) / 10;
                costForNextUnit = baseCost + (baseFuelCost * fuelMultiplier * nextUnits);
            }
            
            // Apply extra discount
            if (extraDiscount > 0) {
                if (discountScope === 'full') {
                    costForNextUnit *= (1 - extraDiscount);
                } else {
                    baseCost *= (1 - extraDiscount);
                    costForNextUnit = packageType === 'basic' ? baseCost : 
                                      baseCost + (Math.round(fuelCostKm * 10) / 10 * (isSpaOrNurburgring ? 1 : 1.3) * nextUnits);
                }
            }
        }
        
        // Check if we can afford this unit
        if (costForNextUnit > totalCredit) {
            break;
        }
        
        units = nextUnits;
        totalCost = costForNextUnit;
        
        // Safety check to prevent infinite loops
        if (units > (unit === 'laps' ? 300 : 3000)) {
            break;
        }
    }
    
    return units;
}

function TotalLapsModel(participant, event, circuitName, carModel, packageType) {
    const trackDayIndices = event.days
        .map((day, idx) => day.circuit && day.circuit.name === circuitName ? idx : -1)
        .filter(idx => idx !== -1);
    if (!trackDayIndices.length) return 0;

    let totalDriven = 0;
    trackDayIndices.forEach(dayIdx => {
        const carsForDay = participant.car_per_day[dayIdx] || [];
        const packagesForDay = participant.package_per_day[dayIdx] || [];
        const drivenForDay = participant.driven_per_day[dayIdx] || [];

        carsForDay.forEach((plate, carIdx) => {
            const car = cars.find(c => c.license_plate === plate);
            if (car && `${car.brand} ${car.model}` === carModel && packagesForDay[carIdx] === packageType) {
                totalDriven += drivenForDay[carIdx] || 0;
            }
        });
    });

    return totalDriven;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
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
            <td><input type="number" id="payment_${index}" step="0.01" value="0"></td>  <!-- Allow any number (positive or negative) -->
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
                    <option value="Refund">Refund</option>  <!-- Added refund option -->
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
        const payment = parseFloat(document.getElementById(`payment_${index}`).value) || 0;  // This will now accept negative values
        const paymentCircuit = document.getElementById(`paymentCircuit_${index}`).value;
        const paymentMethod = document.getElementById(`paymentMethod_${index}`).value;
        const paymentDate = document.getElementById(`paymentDate_${index}`).value;
        const paymentObservation = document.getElementById(`paymentObservation_${index}`).value;

        if (payment !== 0) {  // Changed from payment > 0 to payment !== 0 to accept negative payments
            let affectedDays;
            if (paymentCircuit === 'All') {
                affectedDays = participant.car_per_day.map((dayCars, idx) => dayCars.length > 0 ? idx : -1).filter(idx => idx !== -1);
            } else {
                affectedDays = event.days.map((day, idx) => day.circuit && day.circuit.name === paymentCircuit && participant.car_per_day[idx].length > 0 ? idx : -1).filter(idx => idx !== -1);
            }
            const paymentPerDay = affectedDays.length > 0 ? payment / affectedDays.length : 0;
            participant.paid_per_day = participant.paid_per_day.map((paid, dayIndex) => 
                affectedDays.includes(dayIndex) ? paid + paymentPerDay : paid
            );

            participant.payment_details = participant.payment_details || [];
            participant.payment_details.push({ 
                amount: payment, 
                circuit: paymentCircuit,
                method: paymentMethod, 
                date: paymentDate || new Date().toISOString().split('T')[0], 
                observation: paymentObservation || null 
            });

            // Recalculate paid_status
            const totalPaid = participant.paid_per_day.reduce((sum, paid) => sum + paid, 0);
            const totalCreditUsed = calculateTotalCreditUsed(participant, event);
            participant.paid_status = totalPaid >= totalCreditUsed;
        }
    });

    saveData();
    document.getElementById('processBalancesForm').style.display = 'none';
    hideAllEditForms();
}

function viewAndEditPayments(participantIndex) {
    const event = events[currentEventIndex];
    const participant = event.participants[participantIndex];
    const uniqueCircuits = [...new Set(event.days.map(day => day.circuit ? day.circuit.name : null))].filter(c => c);

    let paymentHTML = `<h3>Payments for ${participant.client.name} ${participant.client.surname}</h3>`;
    paymentHTML += '<table><thead><tr><th>Type</th><th>Amount</th><th>Circuit</th><th>Method</th><th>Date</th><th>Observation</th><th>Actions</th></tr></thead><tbody>';

    // Add package payments
    uniqueCircuits.forEach(circuit => {
        const clientPackagePaid = participant.package_payment && participant.package_payment[circuit] || 0;
        if (clientPackagePaid !== 0) {
            paymentHTML += `
                <tr>
                    <td data-label="Type">Package Payment</td>
                    <td data-label="Amount"><input type="number" value="${clientPackagePaid.toFixed(2)}" id="packagePaid_${circuit}" step="0.01"></td>
                    <td data-label="Circuit">${circuit}</td>
                    <td data-label="Method">N/A</td>
                    <td data-label="Date">N/A</td>
                    <td data-label="Observation">Initial package payment</td>
                    <td data-label="Actions"><button onclick="savePaymentEdit(${participantIndex}, 'package', '${circuit}')">Save</button></td>
                </tr>
            `;
        }
    });

    // Add extra payments
    if (participant.payment_details && participant.payment_details.length > 0) {
        participant.payment_details.forEach((payment, paymentIdx) => {
            paymentHTML += `
                <tr>
                    <td data-label="Type">Extra Payment</td>
                    <td data-label="Amount"><input type="number" value="${payment.amount.toFixed(2)}" id="extraAmount_${paymentIdx}" step="0.01"></td>
                    <td data-label="Circuit">
                        <select id="extraCircuit_${paymentIdx}">
                            <option value="All" ${payment.circuit === 'All' ? 'selected' : ''}>All</option>
                            ${uniqueCircuits.map(c => `<option value="${c}" ${payment.circuit === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </td>
                    <td data-label="Method">
                        <select id="extraMethod_${paymentIdx}">
                            <option value="Cash" ${payment.method === 'Cash' ? 'selected' : ''}>Cash</option>
                            <option value="Credit Card" ${payment.method === 'Credit Card' ? 'selected' : ''}>Credit Card</option>
                            <option value="Bank Transfer" ${payment.method === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
                            <option value="OBS" ${payment.method === 'OBS' ? 'selected' : ''}>OBS</option>
                            <option value="Refund" ${payment.method === 'Refund' ? 'selected' : ''}>Refund</option>
                        </select>
                    </td>
                    <td data-label="Date"><input type="date" value="${payment.date}" id="extraDate_${paymentIdx}"></td>
                    <td data-label="Observation"><input type="text" value="${payment.observation || ''}" id="extraObservation_${paymentIdx}"></td>
                    <td data-label="Actions">
                        <button onclick="savePaymentEdit(${participantIndex}, 'extra', ${paymentIdx})">Save</button>
                        <button onclick="deletePayment(${participantIndex}, ${paymentIdx})">Delete</button>
                    </td>
                </tr>
            `;
        });
    }

    paymentHTML += '</tbody></table>';
    // Add close button in a modal-buttons div
    paymentHTML += `
        <div class="modal-buttons">
            <button onclick="hideModal('viewPaymentsModal')">Close</button>
        </div>
    `;

    document.getElementById('viewPaymentsContent').innerHTML = paymentHTML;
    showModal('viewPaymentsModal'); // Use existing showModal function
}

// Ensure showModal and hideModal are correctly implemented
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

function savePaymentEdit(participantIndex, type, identifier) {
    const event = events[currentEventIndex];
    const participant = event.participants[participantIndex];
    const uniqueCircuits = [...new Set(event.days.map(day => day.circuit ? day.circuit.name : null))].filter(c => c);

    if (type === 'package') {
        const circuit = identifier;
        const oldPaid = participant.package_payment && participant.package_payment[circuit] || 0;
        const newPaid = parseFloat(document.getElementById(`packagePaid_${circuit}`).value) || 0;
        const daysForCircuit = event.days.filter(day => day.circuit && day.circuit.name === circuit).length;
        const oldPaidPerDay = daysForCircuit > 0 ? oldPaid / daysForCircuit : 0;
        const newPaidPerDay = daysForCircuit > 0 ? newPaid / daysForCircuit : 0;

        // Subtract old payment and add new payment to paid_per_day
        event.days.forEach((day, dayIndex) => {
            if (day.circuit && day.circuit.name === circuit) {
                participant.paid_per_day[dayIndex] = (participant.paid_per_day[dayIndex] || 0) - oldPaidPerDay + newPaidPerDay;
            }
        });

        participant.package_payment = participant.package_payment || {};
        participant.package_payment[circuit] = newPaid;
    } else if (type === 'extra') {
        const paymentIdx = identifier;
        const payment = participant.payment_details[paymentIdx];
        const oldAmount = payment.amount;
        const newAmount = parseFloat(document.getElementById(`extraAmount_${paymentIdx}`).value) || 0;
        const circuit = document.getElementById(`extraCircuit_${paymentIdx}`).value;

        // Update payment details
        payment.amount = newAmount;
        payment.circuit = circuit;
        payment.method = document.getElementById(`extraMethod_${paymentIdx}`).value;
        payment.date = document.getElementById(`extraDate_${paymentIdx}`).value;
        payment.observation = document.getElementById(`extraObservation_${paymentIdx}`).value || null;

        // Adjust paid_per_day based on the difference
        const affectedDays = circuit === 'All'
            ? participant.car_per_day.map((dayCars, idx) => dayCars.length > 0 ? idx : -1).filter(idx => idx !== -1)
            : event.days.map((day, idx) => day.circuit && day.circuit.name === circuit && participant.car_per_day[idx].length > 0 ? idx : -1).filter(idx => idx !== -1);
        const amountDiff = newAmount - oldAmount;
        const diffPerDay = affectedDays.length > 0 ? amountDiff / affectedDays.length : 0;

        affectedDays.forEach(dayIndex => {
            participant.paid_per_day[dayIndex] = (participant.paid_per_day[dayIndex] || 0) + diffPerDay;
        });
    }

    // Recalculate paid status
    const totalPaid = participant.paid_per_day.reduce((sum, paid) => sum + paid, 0);
    const totalCreditUsed = calculateTotalCreditUsed(participant, event);
    participant.paid_status = totalPaid >= totalCreditUsed;

    saveData();
    viewAndEditPayments(participantIndex);
}

function deletePayment(participantIndex, paymentIdx) {
    const event = events[currentEventIndex];
    const participant = event.participants[participantIndex];
    const payment = participant.payment_details[paymentIdx];
    
    // Remove the payment amount from the participant's paid_per_day
    const daysParticipated = participant.car_per_day
        .map((_, dayIndex) => participant.car_per_day[dayIndex].length > 0 ? dayIndex : -1)
        .filter(idx => idx !== -1);
    
    const paymentPerDay = daysParticipated.length > 0 ? payment.amount / daysParticipated.length : 0;
    
    // Deduct the payment from paid_per_day for each participated day
    daysParticipated.forEach(dayIndex => {
        participant.paid_per_day[dayIndex] = Math.max(0, (participant.paid_per_day[dayIndex] || 0) - paymentPerDay);
    });
    
    // Remove the payment from payment_details
    participant.payment_details.splice(paymentIdx, 1);
    
    // Recalculate paid_status
    const totalPaid = participant.paid_per_day.reduce((sum, paid) => sum + paid, 0);
    const totalCreditUsed = calculateTotalCreditUsed(participant, event);
    participant.paid_status = totalPaid >= totalCreditUsed;
    
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
