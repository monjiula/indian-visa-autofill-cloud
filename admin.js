// admin.js
import { getAllUsersProfiles, adminDeleteProfile } from './storage.js';

let allProfilesCache = {};

window.onload = () => {
    if (!window.auth) return;

    const loading = document.getElementById('loadingIndicator');
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            loading.style.display = 'inline';
            const doc = await db.collection('roles').doc(user.uid).get();
            if (doc.exists && doc.data().role === 'admin') {
                await loadAdminData();
            } else {
                document.body.innerHTML = '<h2 style="color:red; text-align:center;">Access Denied. You are not an admin.</h2>';
            }
            loading.style.display = 'none';
        } else {
            document.body.innerHTML = '<h2 style="text-align:center;">Please log in first.</h2>';
        }
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderTable(e.target.value.toLowerCase());
    });

    document.getElementById('exportCsvBtn').addEventListener('click', exportToCsv);

    document.getElementById('closeModalBtn').onclick = () => {
        document.getElementById('detailsModal').style.display = 'none';
    };
};

async function loadAdminData() {
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '<tr><td colspan="5">Fetching records...</td></tr>';
    
    try {
        allProfilesCache = await getAllUsersProfiles();
        renderTable();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:red;">Error: ${err.message}</td></tr>`;
    }
}

function renderTable(query = '') {
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '';
    
    const keys = Object.keys(allProfilesCache);
    let count = 0;

    keys.forEach(key => {
        const p = allProfilesCache[key];
        const name = (p._savedName || p.givenName || 'N/A').toLowerCase();
        const identifier = (p.passNo || p.nidNo || 'Unknown').toLowerCase();
        
        if (query && !name.includes(query) && !identifier.includes(query) && !key.toLowerCase().includes(query)) {
            return;
        }

        count++;
        const tr = document.createElement('tr');
        
        const date = p._createdAt ? new Date(p._createdAt).toLocaleString() : 'N/A';
        const displayId = p.passNo || p.nidNo || 'Unknown';
        
        tr.innerHTML = `
            <td><span style="background:#334155; padding:3px 6px; border-radius:4px; font-size:11px;">${p._type || 'Unknown'}</span></td>
            <td><strong>${p._savedName || p.givenName || 'N/A'}</strong></td>
            <td>${displayId}</td>
            <td>${date}</td>
            <td>
                <button class="view-btn" data-key="${key}">View JSON</button>
                <button class="del-btn" data-key="${key}">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('statsDisplay').innerText = `Total Profiles: ${count}`;

    if (count === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No profiles found matching your search.</td></tr>';
    }

    // Attach event listeners for buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.onclick = () => {
            const key = btn.getAttribute('data-key');
            const data = allProfilesCache[key];
            document.getElementById('modalTitle').innerText = data._savedName || 'Profile Details';
            // Strip out internal fields for clean display
            const displayData = { ...data };
            delete displayData._fullPath;
            document.getElementById('modalContent').textContent = JSON.stringify(displayData, null, 2);
            document.getElementById('detailsModal').style.display = 'flex';
        };
    });

    document.querySelectorAll('.del-btn').forEach(btn => {
        btn.onclick = async () => {
            const key = btn.getAttribute('data-key');
            const p = allProfilesCache[key];
            if (confirm(`Are you sure you want to permanently delete profile: ${p._savedName}?`)) {
                try {
                    await adminDeleteProfile(p._fullPath);
                    delete allProfilesCache[key];
                    renderTable(document.getElementById('searchInput').value.toLowerCase());
                } catch (err) {
                    alert('Error deleting: ' + err.message);
                }
            }
        };
    });
}

function exportToCsv() {
    const keys = Object.keys(allProfilesCache);
    if (keys.length === 0) return alert('No data to export.');

    // Get all possible headers
    const headersSet = new Set();
    keys.forEach(k => Object.keys(allProfilesCache[k]).forEach(h => {
        if (h !== '_fullPath') headersSet.add(h);
    }));
    const headers = Array.from(headersSet);

    let csv = headers.join(',') + '\n';
    
    keys.forEach(k => {
        const row = headers.map(header => {
            let val = allProfilesCache[k][header];
            if (val === undefined || val === null) val = '';
            // Escape quotes and wrap in quotes
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
        });
        csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ivap_cloud_export_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
