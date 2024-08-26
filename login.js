// Example usage
const apiUrl = "https://learn.reboot01.com/api/auth/signin";

document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;

    try {
        let data = await makePostRequestWithBasicAuth(apiUrl, username, password);
        localStorage.setItem("jwtToken", data);
        document.getElementById("message").innerText = "Login successful!";

        // If you want to redirect after getting userId, uncomment the following line
        window.location.href = "profile.html";
    } catch (error) {
        document.getElementById("message").innerText =
            "Invalid username or password. Please try again.";
    }
});

// Function to make a POST request with Basic Authentication
async function makePostRequestWithBasicAuth(url, username, password) {
    const credentials = `${username}:${password}`;
    const base64Credentials = btoa(credentials);

    return fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${base64Credentials}`,
            },
        })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .catch((error) => {
            throw new Error("Error:", error);
        });
}