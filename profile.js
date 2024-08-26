var userId; // Assuming you define this variable elsewhere in your code

// 1. User Transaction Queries

const userTransactionQuery = `
  query GetTransactionData {
    transaction(where: { type: { _eq: "xp" } }) {
      id
      type
      amount
      objectId
      userId
      createdAt
      path
    }
  }
`;

const userTransactionUpQuery = `
  query GetTransactionData {
    transaction(where: { type: { _eq: "up" } }) {
      id
      type
      amount
      objectId
      userId
      createdAt
      path
    }
  }
`;

const userTransactionDownQuery = `
  query GetTransactionData {
    transaction(where: { type: { _eq: "down" } }) {
      id
      type
      amount
      objectId
      userId
      createdAt
      path
    }
  }
`;

// 2. User Progress Query

const userProgressQuery = `
  query GetUserProgress {
    progress(where: { object: { type: { _eq: "project" } } }) {
      id
      userId
      objectId
      grade
      createdAt
      updatedAt
      object {
        id
        name
        type
        attrs
      }
    }
  }
`;

// 3. User Result Query

const userResultQuery = `
  query GetUserResult {
    result {
      id
      userId
      objectId
      grade
      createdAt
      updatedAt
    }
  }
`;

// 4. Object Query

const objectQuery = `
  query GetObjectsData($objectIds: [Int!]!) {
    object(where: { id: { _in: $objectIds } }) {
      id
      name
      type
      attrs
    }
  }
`;

// 5. User Details Query

const userDetailsQuery = `
  query GetUser {
    user {
      id
      login
      totalUp
      totalDown
      auditRatio
    }
    event_user(where: { eventId: { _eq: 20 } }) {
      level
      userAuditRatio
    }
  }
`;

// 6. Basic User Query

const user = `
  query GetUser {
    user {
      id
      login
    }
  }
`;

// 7. User Skills Query

const userSkillsQuery = `
  query GetUserSkills {
    user {
      transactions(
        order_by: [{ type: desc }, { amount: desc }]
        distinct_on: [type]
        where: {
          type: { _in: ["skill_js", "skill_go", "skill_html", "skill_prog", "skill_front-end", "skill_back-end"] }
        }
      ) {
        type
        amount
      }
    }
  }
`;

// 8. User Stats Query

const userStats = `
  query GetDevStatus {
    user {
      attrs
    }
  }
`;

////

/// start the profile

async function start() {
    try {
        const user = await getUser(); // Wait for getUser function to resolve
        userId = user.id;
        const transactionUpData = await fetchData(userTransactionUpQuery);
        const progress = await fetchData(userProgressQuery);
        const userData = await fetchData(userDetailsQuery);
        const skills = await fetchData(userSkillsQuery);
        const stats = await fetchData(userStats);
        // const idk = await fetchData(objectQuery);
        const userTransaction = await fetchData(userTransactionQuery);
        UserXp(userTransaction);
        hello(stats);
        console.log(progress);
        createRadarChart(skills, "radarChartDiv");
        // Call the function to display user information
        addAuditRatio(userData, transactionUpData.transaction);
        PieChart(generateSlices(createPathObject(transactionUpData.transaction)));
        const username = userData.user[0].login;
        const level = userData.event_user[0].level;
        document.getElementById("userName").innerHTML = username;
        document.getElementById("level").innerHTML = level;
    } catch (error) {
        console.error("GraphQL Error:", error);
    }
}

start();

/////

//// hello mariam

function hello(stats) {
    const helloSpan = document.getElementById("userNameHello");
    helloSpan.textContent = `Hello ${stats.user[0].attrs.firstName} ${stats.user[0].attrs.lastName} !`;
}

/// get the user
async function getUser() {
    try {
        const response = await fetch("https://learn.reboot01.com/api/graphql-engine/v1/graphql", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: `
                    query {
                        user {
                            id
                            login
                        }
                    }
                `,
            }),
        });

        console.log(localStorage.getItem("jwtToken"));

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();

        if (data.errors) {
            console.error(data.errors);
            return;
        }

        if (data.data.user.length === 0) {
            console.log("No user found");
            return;
        }

        return data.data.user[0];
    } catch (error) {
        console.error("GraphQL Error:", error);
    }
}
/// end

// to fetch the data
async function fetchData(query) {
    try {
        const response = await fetch("https://learn.reboot01.com/api/graphql-engine/v1/graphql", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query,
            }),
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();

        if (data.errors) {
            console.error(data.errors);
            if (data.errors[0].message === "Could not verify JWT: JWTExpired") {
                localStorage.removeItem("hasura-jwt");
                window.location.href = "index.html";
            }
            return;
        }

        return data.data;
    } catch (error) {
        console.error("GraphQL Error:", error);
    }
}

// end

/// to create teh pie chart

const svgElement = document.getElementById("pieChart");

function interpolateColor(color1, color2, factor) {
    const hexToRgb = (hex) => {
        const bigint = parseInt(hex.slice(1), 16);
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    };

    const rgbToHex = (r, g, b) => {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };

    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    const resultRgb = rgb1.map((val, i) => Math.round(val + factor * (rgb2[i] - val)));
    return rgbToHex(...resultRgb);
}

function generateSlices(data) {
    const total = Object.values(data).reduce((sum, value) => sum + value, 0);
    const colorStops = ["#050152", "#340979", "#00d4ff"];
    const slices = [];

    Object.entries(data).forEach(([path, value], index) => {
        const ratio = value / total;
        const factor = index / (Object.keys(data).length - 1);

        const color1 = colorStops[Math.floor(factor * (colorStops.length - 1))];
        const color2 = colorStops[Math.ceil(factor * (colorStops.length - 1))];
        const colorFactor = (factor * (colorStops.length - 1)) % 1;
        const color = interpolateColor(color1, color2, colorFactor);
        slices.push({ path, ratio, color });
    });

    return slices;
}

function createPathObject(transactionData) {
    const pathCount = {};
    transactionData.forEach((transaction) => {
        const path = transaction.path;
        if (pathCount[path]) {
            pathCount[path] += 1;
        } else {
            pathCount[path] = 1;
        }
    });

    return pathCount;
}

function calculatePieSlicePath(cx, cy, radius, startAngle, ratio) {
    const endAngle = startAngle + ratio * 360;
    const startRad = (Math.PI / 180) * startAngle;
    const endRad = (Math.PI / 180) * endAngle;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArcFlag = ratio > 0.5 ? 1 : 0;
    const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    return pathData;
}
const tooltip = document.getElementById("tooltip");

function appendPathToSVG(svgElement, pathData, fillColor, pathId) {
    const newPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    newPath.setAttribute("d", pathData);
    newPath.setAttribute("fill", fillColor);
    newPath.setAttribute("id", pathId);
    svgElement.appendChild(newPath);

    // Adding event listeners to the newly created path
    newPath.addEventListener("mouseenter", () => {
        tooltip.style.display = "block";
        tooltip.textContent = newPath.id.split("/").pop();
    });

    newPath.addEventListener("mousemove", (event) => {
        // Calculate tooltip position relative to pieChartDiv
        const pieChartRect = svgElement.getBoundingClientRect();
        const tooltipX = event.clientX - pieChartRect.left;
        const tooltipY = event.clientY - 250;

        tooltip.style.left = `${tooltipX}px`;
        tooltip.style.top = `${tooltipY + 10}px`; // Slight offset below the cursor
    });

    newPath.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
    });
}

function PieChart(slices) {
    // Initialize SVG and add slices
    const svgElement = document.getElementById("pieChart");
    const cx = 0; // Center x
    const cy = 0; // Center y
    const radius = 100; // Radius of the pie
    let startAngle = 0; // Starting angle in degrees
    // Loop through slices and append paths
    slices.forEach((slice) => {
        const pathData = calculatePieSlicePath(cx, cy, radius, startAngle, slice.ratio);
        appendPathToSVG(svgElement, pathData, slice.color, slice.path);
        startAngle += slice.ratio * 360; // Update start angle for next slice
    });
}

/// end of the pie chart decleration

//// audit ratio bar
function addAuditRatio(userData, transactionUpData, transactionDownData) {
    const auditRatio = userData.user[0].auditRatio;

    // Calculate total amount for transactionUpData and transactionDownData
    const totalUpAmount = userData.user[0].totalUp;
    const totalDownAmount = userData.user[0].totalDown;

    // Set max value for scaling bar lengths
    const maxValue = Math.max(totalUpAmount, totalDownAmount, 1); // Prevent division by zero

    // Calculate bar widths relative to maxValue
    const doneBarWidth = (totalUpAmount / maxValue) * 180; // Adjust to your desired max width
    const receivedBarWidth = (totalDownAmount / maxValue) * 180; // Adjust to your desired max width

    // Update the text content
    document.getElementById("doneValue").textContent = formatToBillions(totalUpAmount);
    document.getElementById("receivedValue").textContent = formatToBillions(totalDownAmount);
    document.getElementById("userRatio").textContent = auditRatio.toFixed(1);

    // Update bar widths
    document.getElementById("doneBar").setAttribute("width", doneBarWidth);
    document.getElementById("receivedBar").setAttribute("width", receivedBarWidth);
    document.getElementById("doneValue").setAttribute("x", 5 + doneBarWidth);
    document.getElementById("doneText").setAttribute("x", 5 + doneBarWidth);
    document.getElementById("receivedValue").setAttribute("x", 5 + receivedBarWidth);
    document.getElementById("receivedText").setAttribute("x", 5 + receivedBarWidth);
    // Update the message based on auditRatio
    if (auditRatio < 1) {
        document.getElementById("userMessage").textContent = "you are so bad";
    } else if (auditRatio === 1) {
        document.getElementById("userMessage").textContent = "nice work";
    } else {
        document.getElementById("userMessage").textContent = "يابن المحظوظة";
    }
}

// Helper function to format numbers to billions with two decimal places
function formatToBillions(amount) {
    const billion = 1e6;
    const roundedAmount = (amount / billion).toFixed(2);
    return `${roundedAmount} MB`;
}

/// end

///user skills

function createRadarChart(data, containerId) {
    // Configuration for the radar chart
    const config = {
        size: 400,
        radius: 100,
        levels: 5,
        maxValue: 100,
        factor: 1,
        factorLegend: 0.95, // Adjusted for better label positioning
        offsetX: 0, // Horizontal offset
        offsetY: -50, // Vertical offset
    };

    // Extract types and amounts from the data
    const labels = data.user[0].transactions.map((transaction) => transaction.type);
    const dataPoints = data.user[0].transactions.map((transaction) => transaction.amount);

    // Calculate radius based on the config
    const chartRadius = config.radius;
    const svg = createSvgContainer(config.size);

    // Draw radar background
    drawRadarBackground(svg, labels, chartRadius, config);

    // Draw data points
    drawDataPoints(svg, dataPoints, labels.length, chartRadius, config);

    // Append the SVG to the specified container
    document.getElementById(containerId).appendChild(svg);

    // Function to create SVG container
    function createSvgContainer(size) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", size);
        svg.setAttribute("height", size);
        svg.style.background = "none"; // Transparent background
        return svg;
    }

    // Function to draw radar background with borders
    function drawRadarBackground(svg, labels, radius, config) {
        const angleSlice = (Math.PI * 2) / labels.length;

        for (let level = 0; level < config.levels; level++) {
            const levelFactor = config.factor * radius * ((level + 1) / config.levels);
            const points = [];

            for (let i = 0; i < labels.length; i++) {
                const x = config.offsetX + config.size / 2 + levelFactor * Math.sin(i * angleSlice);
                const y = config.offsetY + config.size / 2 - levelFactor * Math.cos(i * angleSlice);
                points.push([x, y]);
            }

            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            polygon.setAttribute("points", points.map((p) => p.join(",")).join(" "));
            polygon.setAttribute("fill", "none"); // Transparent fill for background polygons
            polygon.setAttribute("stroke", "#00d4ff");
            polygon.setAttribute("stroke-width", 1);
            svg.appendChild(polygon);
        }

        // Draw lines between each type
        for (let i = 0; i < labels.length; i++) {
            const x =
                config.offsetX +
                config.size / 2 +
                config.factor * radius * Math.sin(i * angleSlice);
            const y =
                config.offsetY +
                config.size / 2 -
                config.factor * radius * Math.cos(i * angleSlice);
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", config.offsetX + config.size / 2);
            line.setAttribute("y1", config.offsetY + config.size / 2);
            line.setAttribute("x2", x);
            line.setAttribute("y2", y);
            line.setAttribute("stroke", "#999");
            line.setAttribute("stroke-width", 1);
            svg.appendChild(line);
        }

        // Draw labels on the borders, centered between the vertices, parallel with the edges
        for (let i = 0; i < labels.length; i++) {
            const angle = angleSlice * (i + 0.5); // Position halfway between two vertices
            const labelX =
                config.offsetX + config.size / 2 + config.factorLegend * radius * Math.sin(angle);
            const labelY =
                config.offsetY + config.size / 2 - config.factorLegend * radius * Math.cos(angle);
            const rotationAngle = (angle * 180) / Math.PI; // Convert radians to degrees

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", labelX);
            text.setAttribute("y", labelY);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("fill", "white"); // White labels
            text.setAttribute("transform", `rotate(${rotationAngle}, ${labelX}, ${labelY})`); // Rotate text
            text.textContent = labels[i];
            text.style.fontSize = "10px"; // Adjust font size as needed
            svg.appendChild(text);
        }

        // Draw levels with smaller text
        for (let level = 0; level < config.levels; level++) {
            const levelFactor = config.factor * radius * ((level + 1) / config.levels);
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", config.offsetX + config.size / 2 + 5); // Positioning next to the center
            text.setAttribute("y", config.offsetY + config.size / 2 - levelFactor);
            text.setAttribute("fill", "#999");
            text.setAttribute("font-size", "8px"); // Smaller text size
            text.textContent = (((level + 1) * config.maxValue) / config.levels).toString();
            svg.appendChild(text);
        }
    }

    // Function to draw data points on the radar chart
    function drawDataPoints(svg, dataPoints, numPoints, radius, config) {
        const angleSlice = (Math.PI * 2) / numPoints;
        const points = dataPoints.map((amount, i) => {
            const x =
                config.offsetX +
                config.size / 2 +
                config.factor * radius * (amount / config.maxValue) * Math.sin(i * angleSlice);
            const y =
                config.offsetY +
                config.size / 2 -
                config.factor * radius * (amount / config.maxValue) * Math.cos(i * angleSlice);
            return [x, y];
        });

        // Draw the data polygon
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", points.map((p) => p.join(",")).join(" "));
        polygon.setAttribute("fill", "rgba(0, 174, 255, 0.4)");
        // polygon.setAttribute("stroke", "rgba(0, 204, 232, 0.)");
        polygon.setAttribute("stroke-width", 2);
        svg.appendChild(polygon);

        // Draw data points with color #00aadf
        points.forEach((point) => {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", point[0]);
            circle.setAttribute("cy", point[1]);
            circle.setAttribute("r", 3);
            circle.setAttribute("fill", "#00aadf"); // Custom point color
            svg.appendChild(circle);
        });
    }
}

/////
function sumXpForSpecificPath(userTransactionQueryData) {
    // Check if the transaction data is valid and an array
    if (!userTransactionQueryData || !Array.isArray(userTransactionQueryData.transaction)) {
        console.error("Invalid data format");
        return { totalXp: 0, projectXp: {} };
    }

    // Extract the transaction array from the query result
    const transactions = userTransactionQueryData.transaction;

    // Sort transactions by 'createdAt' in ascending order
    transactions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Initialize an object to store XP sums for each project
    const projectXp = {};

    // Calculate the sum of the amounts where path contains "/bahrain/bh-module"
    const totalXpSum = transactions.reduce((sum, transaction) => {
        // Check if the path contains the specified substring and amount is a number
        if (
            transaction.path &&
            transaction.path.includes("/bahrain/bh-module") &&
            !transaction.path.includes("piscine-js/") &&
            !transaction.path.includes("quest") &&
            !transaction.path.includes("checkpoint-01") &&
            typeof transaction.amount === "number"
        ) {
            // Add to the total sum
            sum += transaction.amount;

            // Extract the project name or path for grouping
            const projectName = transaction.path;

            // Add to the project's XP sum
            if (!projectXp[projectName]) {
                projectXp[projectName] = 0;
            }
            projectXp[projectName] += transaction.amount;
        }
        return sum;
    }, 0);

    return { totalXp: totalXpSum, projectXp: projectXp };
}

function UserXp(userTransactionQueryData) {
    // Get the calculated data
    const { totalXp, projectXp } = sumXpForSpecificPath(userTransactionQueryData);

    // Update the total XP span
    const totalXpElement = document.getElementById("totalXP");
    totalXpElement.innerText = `${formatToBillions(totalXp)}`;

    // Clear previous project spans, if any
    const xpElement = document.getElementById("lastProjects");
    xpElement.innerHTML = ""; // Clear existing content

    // Get the last 3 projects based on their insertion order and reverse to display the latest ones
    const projectKeys = Object.keys(projectXp);
    const lastThreeProjects = projectKeys.slice(-3).reverse();

    // Create a new span for each project and append it to the container
    lastThreeProjects.forEach((project) => {
        const projectName = project.replace("/bahrain/bh-module/", "");
        const projectSpan = document.createElement("span");
        projectSpan.innerText = `${projectName} - ${projectXp[project]}B`;

        // Style the project span to match your design
        projectSpan.style.marginRight = "10px";
        projectSpan.style.display = "inline-block"; // This keeps them side by side
        projectSpan.setAttribute("text-align", "justify");
        xpElement.appendChild(projectSpan);
    });
}


document.getElementById('signOut').addEventListener('click', function () {
        localStorage.removeItem('jwtToken');
        window.location.href = 'index.html';
});

