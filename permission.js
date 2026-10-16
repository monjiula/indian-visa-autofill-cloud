// permission.js

const PORTAL_NAMES = {
    'airsuvidha': 'Air Suvidha Portal',
    'traveltax': 'Sonali Bank Travel Tax',
    'porttax': 'BLPA Port Tax Portal',
    'status': 'Indian Visa Status Enquiry',
    'earrival': 'Indian e-Arrival Card Portal'
};

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const portalKey = params.get('portal') || '';
    const targetUrl = params.get('target') || '';
    const originPattern = params.get('origin') || '';

    const nameDisplay = document.getElementById('portalNameDisplay');
    if (nameDisplay) {
        nameDisplay.textContent = PORTAL_NAMES[portalKey] || 'this portal';
    }

    // Check if permission is already granted; if so, redirect immediately
    if (originPattern) {
        try {
            const hasPerm = await chrome.permissions.contains({ origins: [originPattern] });
            if (hasPerm && targetUrl) {
                await chrome.runtime.sendMessage({ type: "REGISTER_DYNAMIC_SCRIPTS" });
                window.location.href = targetUrl;
                return;
            }
        } catch (e) { }
    }

    const allowBtn = document.getElementById('allowBtn');
    if (allowBtn) {
        allowBtn.onclick = async () => {
            allowBtn.disabled = true;
            allowBtn.textContent = 'Requesting...';

            try {
                const origins = originPattern ? [originPattern] : [];
                let granted = false;
                if (origins.length > 0) {
                    granted = await chrome.permissions.request({ origins });
                }

                if (granted) {
                    await chrome.runtime.sendMessage({ type: "REGISTER_DYNAMIC_SCRIPTS" });
                    if (targetUrl) {
                        window.location.href = targetUrl;
                    } else {
                        window.close();
                    }
                } else {
                    allowBtn.disabled = false;
                    allowBtn.innerHTML = '<span>Permission Denied. Click to Retry</span> <span>➔</span>';
                }
            } catch (err) {
                console.error("Permission request error:", err);
                allowBtn.disabled = false;
                allowBtn.innerHTML = '<span>Error. Click to Retry</span> <span>➔</span>';
            }
        };
    }
});
