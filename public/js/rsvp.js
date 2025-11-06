const form = document.getElementById('rsvpForm');
const response = document.getElementById('response');
const namesContainer = document.getElementById('namesContainer');
const addNameBtn = document.getElementById('addNameBtn');

// Add new name input
addNameBtn.addEventListener('click', () => {
    const newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.name = 'name';
    newInput.placeholder = 'Guest Name';
    newInput.required = true;
    namesContainer.appendChild(newInput);
});

// Handle form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInputs = document.querySelectorAll('input[name="name"]');
    const names = Array.from(nameInputs).map(input => input.value.trim()).filter(Boolean);
    const email = document.getElementById('email').value.trim();
    const adults = document.getElementById('adults').value.trim();
    const kids = document.getElementById('kids').value.trim();

    if (!names.length || !email) {
        response.textContent = "Please fill out all fields.";
        response.style.color = "red";
        return;
    }

    response.innerHTML = '<span class="rsvp-spinner"></span>Sending RSVP...';
    response.style.color = "#333";

    try {
        const res = await fetch('https://rsvp-server-drjw.onrender.com/api/rsvp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                names,
                email,
                guests: { adults: Number(adults), kids: Number(kids) }
            })
        });

        const data = await res.json();

        if (res.ok) {
            response.textContent = data.message;
            response.style.color = "green";
            form.reset();
            namesContainer.innerHTML = '<input type="text" name="name" placeholder="Guest Name" required>';
        } else {
            response.textContent = data.error || "Something went wrong.";
            response.style.color = "red";
        }
    } catch (err) {
        response.textContent = "Failed to send RSVP. Please try again.";
        response.style.color = "red";
        console.error(err);
    }

    setTimeout(() => { response.textContent = ''; }, 10000);
});
