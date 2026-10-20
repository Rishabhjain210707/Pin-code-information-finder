const body = document.body;
const modeToggle = document.getElementById('modeToggle');
const pinInputGroup = document.getElementById('pinInputGroup');
const areaInputGroup = document.getElementById('areaInputGroup');
const resultsWrapper = document.getElementById('resultsWrapper');
const landmarkContainer = document.getElementById('landmarkContainer');
const recentSearchPanel = document.getElementById('recentSearchPanel');
const recentSearchList = document.getElementById('recentSearchList');

// --- History Logic (STRICTLY PIN/NAME ONLY) ---
let history = JSON.parse(localStorage.getItem('pinHistoryOnly')) || [];

function saveToHistory(query) {
    history = history.filter(item => item !== query);
    history.unshift(query);
    if (history.length > 6) history.pop();
    
    localStorage.setItem('pinHistoryOnly', JSON.stringify(history));
    displayHistory();
}

function displayHistory() {
    if (history.length === 0) {
        recentSearchPanel.style.display = "none";
        return;
    }
    recentSearchPanel.style.display = "block";
    recentSearchList.innerHTML = "";
    history.forEach(item => {
        recentSearchList.innerHTML += `
            <div class="recent-item" onclick="useHistory('${item.replace(/'/g, "\\'")}')">
                ${item}
            </div>
        `;
    });
}

function useHistory(query) {
    if (/^\d+$/.test(query)) {
        document.getElementById('pincode').value = query;
        searchByPin();
    } else {
        document.getElementById('areaName').value = query;
        searchByArea();
    }
}

function clearHistory() {
    history = [];
    localStorage.removeItem('pinHistoryOnly');
    displayHistory();
}

displayHistory();

// Key Support
document.getElementById('pincode').addEventListener('keypress', (e) => e.key === 'Enter' && searchByPin());
document.getElementById('areaName').addEventListener('keypress', (e) => e.key === 'Enter' && searchByArea());

modeToggle.addEventListener('click', () => {
    if (pinInputGroup.style.display === 'none') {
        pinInputGroup.style.display = 'block';
        areaInputGroup.style.display = 'none';
        modeToggle.innerText = "I don't know my PIN Code";
        body.classList.remove('area-mode-active');
    } else {
        pinInputGroup.style.display = 'none';
        areaInputGroup.style.display = 'block';
        modeToggle.innerText = "Search by PIN instead";
        body.classList.add('area-mode-active');
    }
    resultsWrapper.innerHTML = "";
    landmarkContainer.style.display = "none";
});

function searchByPin() {
    const pin = document.getElementById('pincode').value.trim();
    if (pin.length !== 6 || isNaN(pin)) return alert("Please enter a valid 6-digit PIN code.");
    fetchData(`https://api.postalpincode.in/pincode/${pin}`, "", pin);
}

function searchByArea() {
    const area = document.getElementById('areaName').value.trim();
    const stateFilter = document.getElementById('stateSelect').value;
    if (!area) return alert("Please enter an area or post office name.");
    fetchData(`https://api.postalpincode.in/postoffice/${encodeURIComponent(area)}`, stateFilter, area);
}

async function fetchData(url, filterState, queryTerm) {
    resultsWrapper.innerHTML = `<div class="text-center mt-5"><div class="spinner-border text-dark"></div></div>`;
    landmarkContainer.style.display = "none";

    try {
        const res = await fetch(url);
        const data = await res.json();
        resultsWrapper.innerHTML = "";

        if (data[0] && data[0].Status === "Success" && data[0].PostOffice) {
            let offices = data[0].PostOffice;
            
            if (filterState !== "") {
                offices = offices.filter(post => post.State.toLowerCase() === filterState.toLowerCase());
            }

            if (offices.length === 0) {
                resultsWrapper.innerHTML = `<div class="alert alert-warning">No post offices found for state filter "${filterState}".</div>`;
                return;
            }

            saveToHistory(queryTerm);

            // Log search result to database
            fetch("save_search.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    search_type: /^\d{6}$/.test(queryTerm) ? "PIN" : "AREA",
                    search_value: queryTerm,
                    state: offices[0].State,
                    district: offices[0].District,
                    post_office: offices[0].Name,
                    pincode: offices[0].Pincode,
                    delivery_status: offices[0].DeliveryStatus
                })
            })
            .then(response => response.text())
            .then(data => console.log("DB Log Response:", data))
            .catch(error => console.error("Database log error:", error));

            getLandmark(offices[0].District, offices[0].State);

            offices.forEach(post => {
                resultsWrapper.innerHTML += `
                    <div class="post-card">
                        <div class="mb-3">
                            <span class="detail-label">📮 PIN Code</span>
                            <h4 class="fw-bold m-0">${post.Pincode}</h4>
                        </div>
                        <div class="mb-2">
                            <span class="detail-label">📍 Post Office</span>
                            <span class="fw-bold" style="color: #2d5038;">${post.Name}</span>
                        </div>
                        <div class="mb-2">
                            <span class="detail-label">🏛 State</span>
                            <span>${post.State}</span>
                        </div>
                        <div class="mb-2">
                            <span class="detail-label">🌍 District</span>
                            <span>${post.District}</span>
                        </div>
                        <div class="mb-2">
                            <span class="detail-label">🚚 Delivery Status</span>
                            <span class="status-badge ${post.DeliveryStatus === 'Delivery' ? 'status-yes' : 'status-no'}">
                                ${post.DeliveryStatus}
                            </span>
                        </div>
                    </div>`;
            });
        } else {
            resultsWrapper.innerHTML = `<div class="alert alert-danger">No information found for your request.</div>`;
        }
    } catch (e) {
        resultsWrapper.innerHTML = `<div class="alert alert-danger">Error connecting to server. Please try again.</div>`;
    }
}

async function getLandmark(district, state) {
    const fallbackImg = `https://images.unsplash.com/photo-1524492459585-1a9fb971994b?auto=format&fit=crop&w=600&q=80`;
    try {
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(district)}`;
        const res = await fetch(wikiUrl);
        
        if (!res.ok) throw new Error("Landmark fetch failed");
        
        const data = await res.json();
        document.getElementById('landmarkTitle').innerText = district;
        document.getElementById('landmarkDesc').innerText = data.extract || `Explore ${district}, ${state}.`;
        document.getElementById('landmarkImg').src = (data.thumbnail && data.thumbnail.source) ? data.thumbnail.source : fallbackImg;
        landmarkContainer.style.display = "block";
    } catch (e) {
        document.getElementById('landmarkTitle').innerText = district;
        document.getElementById('landmarkDesc').innerText = `Explore ${district}, ${state}.`;
        document.getElementById('landmarkImg').src = fallbackImg;
        landmarkContainer.style.display = "block";
    }
}