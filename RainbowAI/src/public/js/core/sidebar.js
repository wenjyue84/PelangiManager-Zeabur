/**
 * Sidebar Collapse Logic
 */
(function () {
    const sidebar = document.getElementById('app-sidebar');
    const main = document.getElementById('app-main');
    const toggle = document.getElementById('sidebar-toggle');

    if (!sidebar || !main || !toggle) return;

    const toggleIcon = toggle.querySelector('svg');

    // Load state from localStorage
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';

    if (isCollapsed) {
        sidebar.classList.add('collapsed');
        main.classList.add('collapsed');
        updateToggleIcon(true);
        updateNavTooltips(true);
    }

    toggle.addEventListener('click', () => {
        const nowCollapsed = sidebar.classList.toggle('collapsed');
        main.classList.toggle('collapsed');

        updateToggleIcon(nowCollapsed);
        updateNavTooltips(nowCollapsed);
        localStorage.setItem('sidebar-collapsed', nowCollapsed);

        // Dispatch resize event to help charts/layouts adjust
        window.dispatchEvent(new Event('resize'));
    });

    function updateToggleIcon(collapsed) {
        if (collapsed) {
            // Double chevron pointing right (expand)
            toggleIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />';
        } else {
            // Double chevron pointing left (collapse)
            toggleIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />';
        }
    }

    function updateNavTooltips(collapsed) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (collapsed) {
                const labelText = item.querySelector('.nav-label')?.textContent;
                if (labelText) item.setAttribute('title', labelText);
            } else {
                item.removeAttribute('title');
            }
        });
    }
})();
