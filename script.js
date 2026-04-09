// Discord ID'leri
const DISCORD_IDS = [
    "908743424717496320",
    "1114247940484112386"
];

// --- Lanyard API (Discord Status) Entegrasyonu ---
async function fetchDiscordStatuses() {
    try {
        const results = await Promise.allSettled(
            DISCORD_IDS.map(async (id) => {
                const response = await fetch(`https://api.lanyard.rest/v1/users/${id}`);
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("Kullanıcı Lanyard sunucusunda bulunamadı.");
                    }
                    throw new Error(`API Hatası: ${response.status}`);
                }
                const data = await response.json();
                if (!data.success) {
                    throw new Error("Discord verisi alınamadı.");
                }
                return data.data;
            })
        );

        const successful = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);

        if (successful.length === 0) {
            const error = results.find(result => result.status === 'rejected');
            throw error?.reason || new Error("Discord bağlantısı şu an kurulamıyor.");
        }

        updateDiscordUI(successful);
    } catch (error) {
        console.error("Discord verisi çekilemedi:", error);
        showDiscordError("Discord bağlantısı şu an kurulamıyor.");
    }
}

function showDiscordError(message) {
    const container = document.getElementById('discord-profile');
    container.innerHTML = `
        <div class="discord-error">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
}

function renderDiscordProfile(data) {
    const { discord_user, discord_status, activities, listening_to_spotify, spotify } = data;

    const statusColors = {
        online: "#22c55e",
        idle: "#f59e0b",
        dnd: "#ef4444",
        offline: "#64748b"
    };

    const statusText = {
        online: "Çevrimiçi",
        idle: "Boşta",
        dnd: "Rahatsız Etmeyin",
        offline: "Çevrimdışı"
    };

    const avatarHash = discord_user.avatar;
    const isAnimated = avatarHash && avatarHash.startsWith('a_');
    const avatarUrl = avatarHash
        ? `https://cdn.discordapp.com/avatars/${discord_user.id}/${avatarHash}.${isAnimated ? 'gif' : 'webp'}?size=512`
        : `https://cdn.discordapp.com/embed/avatars/${discord_user.discriminator % 5}.png`;

    const displayName = discord_user.global_name || discord_user.username;
    const fullTag = `${discord_user.username}#${discord_user.discriminator}`;

    let spotifyHTML = "";
    if (listening_to_spotify && spotify) {
        spotifyHTML = `
            <div class="spotify-track">
                <div class="spotify-header">
                    <i class="fab fa-spotify"></i>
                    <span>Spotify Dinliyor</span>
                </div>
                <div class="spotify-content">
                    <img src="${spotify.album_art_url}" alt="Album Art" class="album-art">
                    <div class="spotify-info">
                        <div class="song-name">${spotify.song}</div>
                        <div class="artist-name">${spotify.artist}</div>
                    </div>
                    <div class="spotify-wave">
                        <span></span><span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        `;
    }

    let otherActivityHTML = "";
    if (!listening_to_spotify && activities.length > 0) {
        const activity = activities.find(a => a.type !== 4);
        if (activity) {
            otherActivityHTML = `
                <div class="activity">
                    <h5>Şu an ne yapıyor?</h5>
                    <div class="activity-content">
                        ${activity.assets && activity.assets.large_image
                    ? `<img src="https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png" class="activity-img">`
                    : `<div class="activity-icon"><i class="fas fa-gamepad"></i></div>`
                }
                        <div class="activity-details">
                            <p class="activity-name"><strong>${activity.name}</strong></p>
                            <p class="activity-text">${activity.details || ""} ${activity.state || ""}</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    return `
        <div class="discord-item">
            <div class="profile-wrapper">
                <div class="avatar-container">
                    <img src="${avatarUrl}" alt="Avatar" class="avatar">
                    <div class="status-dot" style="background-color: ${statusColors[discord_status] || statusColors.offline}"></div>
                </div>
                <div class="info">
                    <h4>${displayName}</h4>
                    <p class="discord-tag">${fullTag}</p>
                    <div class="status-text-row">
                        <span class="status-name">${statusText[discord_status] || "Bilinmiyor"}</span>
                    </div>
                </div>
            </div>
            <div class="profile-link">
                <a href="https://discord.com/users/${discord_user.id}" target="_blank">Discord Profili</a>
            </div>
            ${spotifyHTML}
            ${otherActivityHTML}
        </div>
    `;
}

function updateDiscordUI(dataArray) {
    const container = document.getElementById('discord-profile');
    const profileCards = dataArray.map(renderDiscordProfile).join('');
    container.innerHTML = `<div class="discord-profiles">${profileCards}</div>`;
}

// --- Kaydırma Animasyonları (Reveal on Scroll) ---
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, observerOptions);

// Tüm reveal sınıfına sahip öğeleri izle
document.addEventListener('DOMContentLoaded', () => {
    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));

    // Discord verisini çek
    fetchDiscordStatuses();
    // Her 30 saniyede bir güncelle
    setInterval(fetchDiscordStatuses, 30000);

    initVisitorSystem();
    initIntroOverlay();
});

function initIntroOverlay() {
    const overlay = document.getElementById('introOverlay');
    const arrow = document.getElementById('introArrow');

    if (!overlay || !arrow) return;

    document.body.classList.add('intro-open');

    arrow.addEventListener('click', () => {
        overlay.classList.add('hidden');
        document.body.classList.remove('intro-open');

        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 600);
    });
}

// Navbar Kaydırma Efekti
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (window.scrollY > 50) {
        nav.style.padding = '1rem 10%';
        nav.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
    } else {
        nav.style.padding = '2rem 10%';
        nav.style.boxShadow = 'none';
    }
});

const COUNT_API_NAMESPACE = "sxlxyn-kisiselweb";
const COUNT_API_KEY = "site_visits";

function formatNumber(n) {
    return new Intl.NumberFormat('tr-TR').format(n);
}

function pickLevel(visitCount) {
    const levels = [
        { name: "Yeni", min: 1, color: "#64748b" },
        { name: "Ziyaretçi", min: 3, color: "#8b5cf6" },
        { name: "Sık Ziyaretçi", min: 7, color: "#3b82f6" },
        { name: "Sadık", min: 15, color: "#22c55e" },
        { name: "Efsane", min: 30, color: "#ef4444" }
    ];
    let current = levels[0];
    for (const lvl of levels) {
        if (visitCount >= lvl.min) current = lvl;
    }
    const idx = levels.findIndex(l => l.name === current.name);
    const next = levels[Math.min(idx + 1, levels.length - 1)];
    const span = Math.max(next.min - current.min, 1);
    const progress = Math.max(Math.min((visitCount - current.min) / span, 1), 0);
    return { current, next, progress };
}

async function initVisitorSystem() {
    const globalEl = document.getElementById("globalVisitCount");
    const userEl = document.getElementById("userVisitCount");
    const levelBadgeEl = document.getElementById("userLevelBadge");
    const levelNameEl = document.getElementById("userLevelName");
    const progressBarEl = document.getElementById("levelProgressBar");
    const progressTextEl = document.getElementById("progressText");

    let visitCount = parseInt(localStorage.getItem("visitCount") || "0", 10);
    visitCount += 1;
    localStorage.setItem("visitCount", String(visitCount));
    if (userEl) userEl.textContent = formatNumber(visitCount);

    const { current, next, progress } = pickLevel(visitCount);
    if (levelBadgeEl) {
        levelBadgeEl.style.background = `linear-gradient(90deg, ${current.color}, ${next.color})`;
        levelBadgeEl.textContent = "Seviye";
    }
    if (levelNameEl) levelNameEl.textContent = current.name;
    if (progressBarEl) progressBarEl.style.width = `${Math.round(progress * 100)}%`;
    if (progressTextEl) {
        const need = Math.max(next.min - visitCount, 0);
        progressTextEl.textContent = need === 0 ? "Maksimum seviyeye ulaştın" : `Sonraki için ${need} ziyaret`;
    }

    try {
        const res = await fetch(`https://api.countapi.xyz/hit/${COUNT_API_NAMESPACE}/${COUNT_API_KEY}`);
        const data = await res.json();
        if (typeof data.value === "number") {
            const formatted = formatNumber(data.value);
            if (globalEl) globalEl.textContent = formatted;
            const floatingEl = document.getElementById("floatingVisitCount");
            if (floatingEl) floatingEl.textContent = formatted;
        }
    } catch {
        if (globalEl) globalEl.textContent = "—";
        const floatingEl = document.getElementById("floatingVisitCount");
        if (floatingEl) floatingEl.textContent = "—";
    }
}
