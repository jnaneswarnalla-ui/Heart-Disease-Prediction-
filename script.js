// ==================================================
// PAGE NAVIGATION
// ==================================================

function showPage(pageId) {

    document.querySelectorAll(".app-page").forEach(function(page) {
        page.classList.remove("active");
    });

    document.getElementById(pageId).classList.add("active");
}


// ==================================================
// SIGN UP / LOGIN NAVIGATION
// ==================================================

function openSignup() {
    showPage("signup-page");
}


function openLogin() {
    showPage("login-page");
}


// ==================================================
// CREATE ACCOUNT
// ==================================================

function createAccount() {

    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword =
        document.getElementById("signup-confirm").value;

    const message =
        document.getElementById("signup-message");


    // Check all fields
    if (
        name === "" ||
        email === "" ||
        password === "" ||
        confirmPassword === ""
    ) {

        message.style.display = "block";

        message.textContent =
            "Please fill in all fields.";

        return;
    }


    // Check password confirmation
    if (password !== confirmPassword) {

        message.style.display = "block";

        message.textContent =
            "Passwords do not match.";

        return;
    }


    // Check whether an account already exists
    const existingUser =
        localStorage.getItem("heartDiseaseUser");


    if (existingUser) {

        const user =
            JSON.parse(existingUser);


        if (user.email === email) {

            message.style.display = "block";

            message.textContent =
                "An account with this email already exists. Please login.";

            return;
        }
    }


    // Create user object
    const user = {

        name: name,
        email: email,
        password: password

    };


    // Save account
    localStorage.setItem(
        "heartDiseaseUser",
        JSON.stringify(user)
    );


    // Success message
    message.style.display = "block";

    message.textContent =
        "Account created successfully!";


    // Go to login page
    setTimeout(function() {

        showPage("login-page");

    }, 1000);
}


// ==================================================
// LOGIN
// ==================================================

function loginUser() {

    const email =
        document.getElementById("login-email").value.trim();

    const password =
        document.getElementById("login-password").value;

    const message =
        document.getElementById("login-message");


    // Check fields
    if (email === "" || password === "") {

        message.style.display = "block";

        message.textContent =
            "Please enter your email and password.";

        return;
    }


    // Get saved account
    const savedUser =
        localStorage.getItem("heartDiseaseUser");


    // No account found
    if (!savedUser) {

        message.style.display = "block";

        message.textContent =
            "No account found. Please sign up first.";

        return;
    }


    // Convert saved data to object
    const user =
        JSON.parse(savedUser);


    // Check email and password
    if (
        email === user.email &&
        password === user.password
    ) {

        message.style.display = "block";

        message.textContent =
            "Login successful!";


        setTimeout(function() {

            showPage("dashboard-page");

        }, 800);

    } else {

        message.style.display = "block";

        message.textContent =
            "Incorrect email or password.";
    }
}


// ==================================================
// DASHBOARD
// ==================================================

function openDashboard() {
    showPage("dashboard-page");
}


function openPredictionForm() {
    showPage("prediction-page");
}


function logoutUser() {
    showPage("login-page");
}


// ==================================================
// HEART DISEASE PREDICTION
// ==================================================

async function makePrediction() {

    // Get patient information

    const age =
        document.getElementById("patient-age").value;

    const sex =
        document.getElementById("patient-sex").value;

    const chestPain =
        document.getElementById("patient-chest-pain").value;

    const restingBP =
        document.getElementById("patient-resting-bp").value;

    const cholesterol =
        document.getElementById("patient-cholesterol").value;

    const fastingBS =
        document.getElementById("patient-fasting-bs").value;

    const restingECG =
        document.getElementById("patient-resting-ecg").value;

    const maxHR =
        document.getElementById("patient-max-hr").value;

    const exerciseAngina =
        document.getElementById("patient-exercise-angina").value;

    const oldpeak =
        document.getElementById("patient-oldpeak").value;

    const stSlope =
        document.getElementById("patient-st-slope").value;


    const message =
        document.getElementById("form-message");


    // Check all fields

    if (
        age === "" ||
        sex === "" ||
        chestPain === "" ||
        restingBP === "" ||
        cholesterol === "" ||
        fastingBS === "" ||
        restingECG === "" ||
        maxHR === "" ||
        exerciseAngina === "" ||
        oldpeak === "" ||
        stSlope === ""
    ) {

        message.style.display = "block";

        message.textContent =
            "Please fill in all patient information.";

        return;
    }


    // Show loading message

    message.style.display = "block";

    message.textContent =
        "Generating prediction...";


    try {

        // Send data to Flask backend

        const response = await fetch(
            "/predict",
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    age: Number(age),

                    sex: sex,

                    chest_pain: chestPain,

                    resting_bp: Number(restingBP),

                    cholesterol: Number(cholesterol),

                    fasting_bs: Number(fastingBS),

                    resting_ecg: restingECG,

                    max_hr: Number(maxHR),

                    exercise_angina: exerciseAngina,

                    oldpeak: Number(oldpeak),

                    st_slope: stSlope

                })
            }
        );


        // Convert response to JSON

        const data =
            await response.json();


        // Check response

        if (!response.ok) {

            throw new Error(
                data.error || "Prediction failed."
            );
        }


        // Display YES or NO

        if (data.prediction === 1) {
            document.getElementById("result-text").textContent =
                "YES - Heart Disease Detected";
        } else {
            document.getElementById("result-text").textContent =
                "NO - No Heart Disease Detected";
        }


        // Open result page

        showPage("result-page");


    } catch (error) {

        console.error(
            "Prediction error:",
            error
        );


        message.style.display = "block";

        message.textContent =
            "Unable to connect to the prediction backend.";
    }
}