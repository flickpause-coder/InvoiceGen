(function () {
    const NAVIGATION = [
        { id: 'dashboard', label: 'Dashboard', href: 'index.html', icon: 'fa-chart-line', badge: 'Live' },
        { id: 'invoices', label: 'Invoices', href: 'invoices.html', icon: 'fa-file-invoice' },
        { id: 'clients', label: 'Clients', href: 'clients.html', icon: 'fa-users' },
        { id: 'invoice-design', label: 'Invoice Design', href: 'invoice-design.html', icon: 'fa-palette' },
        { id: 'automation', label: 'Automation', href: 'invoice-automation.html', icon: 'fa-robot', hidden: true },
        { id: 'settings', label: 'Settings', href: 'settings.html', icon: 'fa-sliders-h' },
        { id: 'subscription', label: 'Subscription', href: 'subscription.html', icon: 'fa-crown' }
    ];

    const DEFAULT_USER = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Admin',
        initials: 'JD'
    };


    function injectStyles() {
        if (document.getElementById('app-shell-styles')) {
            return;
        }
        const style = document.createElement('style');
        style.id = 'app-shell-styles';
        style.textContent = `
            .user-menu {
                transform: translateY(-10px);
                opacity: 0;
                pointer-events: none;
                transition: all 0.2s ease;
            }
            .user-menu.show {
                transform: translateY(0);
                opacity: 1;
                pointer-events: auto;
            }
            .stat-card {
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .stat-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 30px rgba(15, 23, 42, 0.15);
            }
            .glass-panel {
                background: rgba(255, 255, 255, 0.85);
                border-radius: 18px;
                border: 1px solid rgba(148, 163, 184, 0.2);
                box-shadow: 0 20px 50px -20px rgba(30, 41, 59, 0.45);
            }
            .scrollbar-thin::-webkit-scrollbar {
                width: 6px;
            }
            .scrollbar-thin::-webkit-scrollbar-thumb {
                background-color: rgba(100, 116, 139, 0.4);
                border-radius: 9999px;
            }
        `;
        document.head.appendChild(style);
    }

    function buildSidebar(activeId) {
        const navItems = NAVIGATION.filter(item => !item.hidden).map(item => {
            const isActive = item.id === activeId;
            const baseClasses = 'flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200';
            const stateClasses = isActive
                ? 'bg-slate-800/70 text-white shadow-lg shadow-slate-900/20'
                : 'text-slate-200 hover:bg-slate-800/40 hover:text-white';

            return `
                <a data-nav-item="${item.id}" href="${item.href}" class="${baseClasses} ${stateClasses}">
                    <span class="flex items-center space-x-3 font-medium">
                        <i class="fas ${item.icon} text-sm"></i>
                        <span>${item.label}</span>
                    </span>
                    ${item.badge ? `<span class="text-xs bg-blue-500/20 text-blue-200 px-2 py-1 rounded-full">${item.badge}</span>` : ''}
                </a>
            `;
        }).join('');

        return `
            <aside class="hidden lg:flex w-72 bg-slate-900 text-slate-100 flex-col">
                <div class="px-8 py-6 border-b border-slate-800">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                            <i class="fas fa-file-invoice text-blue-300"></i>
                        </div>
                        <div>
                            <p class="text-sm text-slate-400">Welcome back</p>
                            <h1 class="text-xl font-semibold">InvoiceGen</h1>
                        </div>
                    </div>
                </div>
                <nav class="flex-1 px-6 py-6 space-y-2 text-sm" data-shell-nav>
                    ${navItems}
                </nav>
                <div class="px-6 py-6 border-t border-slate-800 space-y-3">
                    <div class="flex items-center justify-between text-xs text-slate-400">
                        <span>Storage used</span>
                        <span>72%</span>
                    </div>
                    <div class="w-full h-2 rounded-full bg-slate-800">
                        <div class="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style="width: 72%;"></div>
                    </div>
                    <button data-logout class="w-full px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                        <i class="fas fa-sign-out-alt mr-2"></i>Logout
                    </button>
                </div>
            </aside>
        `;
    }

    function buildMobileNav(activeId) {
        const navItems = NAVIGATION.filter(item => !item.hidden).map(item => {
            const isActive = item.id === activeId;
            return `
                <a data-nav-item="${item.id}" href="${item.href}" class="flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors ${isActive ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-600 hover:bg-slate-100'}">
                    <i class="fas ${item.icon} text-sm"></i>
                    <span class="font-medium">${item.label}</span>
                </a>
            `;
        }).join('');

        return `
            <div data-mobile-drawer class="fixed inset-0 z-50 hidden">
                <div data-mobile-backdrop class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm opacity-0 transition-opacity"></div>
                <div class="absolute inset-y-0 left-0 w-72 bg-white shadow-xl transform -translate-x-full transition-transform" data-mobile-panel>
                    <div class="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
                        <div>
                            <p class="text-xs text-slate-400 uppercase tracking-wide">Navigation</p>
                            <p class="text-lg font-semibold text-slate-900">InvoiceGen</p>
                        </div>
                        <button data-mobile-close class="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-slate-900">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="p-6 space-y-2 text-sm">
                        ${navItems}
                    </div>
                </div>
            </div>
        `;
    }

    function buildHeader(config, user) {
        const showSearch = config.showSearch !== false;
        return `
            <header class="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-30">
                <div class="px-4 sm:px-6 lg:px-10">
                    <div class="flex items-center justify-between h-16">
                        <div class="flex items-center space-x-3">
                            <button data-mobile-toggle class="lg:hidden w-10 h-10 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center">
                                <i class="fas fa-bars"></i>
                            </button>
                            <div>
                                <p class="text-xs uppercase tracking-wide text-slate-400">${config.headerEyebrow || 'Overview'}</p>
                                <h1 data-header-title class="text-xl font-semibold text-slate-900">${config.headerTitle || 'Dashboard Insights'}</h1>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4">
                            ${showSearch ? `
                                <div class="hidden md:block">
                                    <label class="sr-only" for="global-search">Search</label>
                                    <div class="relative">
                                        <span class="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                            <i class="fas fa-search text-xs"></i>
                                        </span>
                                        <input id="global-search" type="search" placeholder="Search invoices, clients, documents..." class="pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white/80">
                                    </div>
                                </div>
                            ` : ''}
                            <div class="hidden sm:flex items-center space-x-2 text-xs font-medium text-green-600">
                                <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <span>${config.statusLabel || 'Real-time sync enabled'}</span>
                            </div>
                            <button class="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center shadow-sm" title="Notifications">
                                <i class="fas fa-bell"></i>
                            </button>
                            <div class="relative">
                                <button id="user-menu-button" class="flex items-center space-x-3 focus:outline-none">
                                    <div class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                                        <span id="user-initials">${user.initials}</span>
                                    </div>
                                    <div class="hidden md:block text-left">
                                        <div id="user-name" class="text-sm font-semibold text-slate-900">${user.name}</div>
                                        <div id="user-role" class="text-xs text-slate-500">${user.role}</div>
                                    </div>
                                    <i class="fas fa-chevron-down text-xs text-slate-400"></i>
                                </button>
                                <div id="user-menu" class="user-menu absolute right-0 mt-3 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-2">
                                    <div class="px-4 py-3 border-b border-slate-200">
                                        <p id="dropdown-user-name" class="text-sm font-semibold text-slate-900">${user.name}</p>
                                        <p id="dropdown-user-email" class="text-xs text-slate-500">${user.email}</p>
                                    </div>
                                    <a href="settings.html" class="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                                        <i class="fas fa-cog mr-2"></i> Settings
                                    </a>
                                    <a href="subscription.html" class="flex items-center px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100">
                                        <i class="fas fa-credit-card mr-2"></i> Billing
                                    </a>
                                    <button data-logout class="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                                        <i class="fas fa-sign-out-alt mr-2"></i> Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${config.headerSubtitle ? `
                        <div class="pb-4 hidden lg:block">
                            <p data-header-subtitle class="text-sm text-slate-500">${config.headerSubtitle}</p>
                        </div>
                    ` : ''}
                </div>
            </header>
        `;
    }

    function createShell(config) {
        const activeId = config.active || 'dashboard';
        const user = Object.assign({}, DEFAULT_USER, config.user || {});
        const shell = document.createElement('div');
        shell.className = 'min-h-screen flex';
        shell.innerHTML = `
            ${buildSidebar(activeId)}
            <div class="flex-1 flex flex-col" data-shell-main>
                ${buildHeader(config, user)}
                <main class="flex-1 overflow-y-auto">
                    <div data-main-container class="py-8"></div>
                </main>
            </div>
            ${buildMobileNav(activeId)}
        `;
        return shell;
    }

    function applyActiveNav(shell, activeId) {
        shell.querySelectorAll('[data-nav-item]').forEach(link => {
            const isActive = link.getAttribute('data-nav-item') === activeId;
            link.classList.toggle('bg-slate-800/70', isActive && link.closest('aside'));
            link.classList.toggle('text-white', isActive && link.closest('aside'));
            link.classList.toggle('shadow-lg', isActive && link.closest('aside'));
            link.classList.toggle('shadow-slate-900/20', isActive && link.closest('aside'));

            if (link.closest('[data-mobile-drawer]')) {
                link.classList.toggle('bg-slate-900', isActive);
                link.classList.toggle('text-white', isActive);
                link.classList.toggle('shadow-lg', isActive);
                link.classList.toggle('shadow-slate-900/20', isActive);
            }
        });
    }

    function setupUserMenu(shell) {
        const menu = shell.querySelector('#user-menu');
        const button = shell.querySelector('#user-menu-button');

        function hide() {
            menu.classList.remove('show');
        }

        button.addEventListener('click', (event) => {
            event.stopPropagation();
            menu.classList.toggle('show');
        });

        document.addEventListener('click', (event) => {
            if (!menu.contains(event.target) && !button.contains(event.target)) {
                hide();
            }
        });
    }

    function setupLogout(shell) {
        shell.querySelectorAll('[data-logout]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    window.location.href = 'login.html';
                }
            });
        });
    }

    function setupMobileNav(shell) {
        const toggle = shell.querySelector('[data-mobile-toggle]');
        const drawer = shell.querySelector('[data-mobile-drawer]');
        if (!toggle || !drawer) return;

        const backdrop = drawer.querySelector('[data-mobile-backdrop]');
        const panel = drawer.querySelector('[data-mobile-panel]');
        const close = drawer.querySelector('[data-mobile-close]');

        function openDrawer() {
            drawer.classList.remove('hidden');
            requestAnimationFrame(() => {
                backdrop.classList.add('opacity-100');
                backdrop.classList.remove('opacity-0');
                panel.classList.remove('-translate-x-full');
                panel.classList.add('translate-x-0');
            });
            document.body.classList.add('overflow-hidden');
        }

        function closeDrawer() {
            backdrop.classList.add('opacity-0');
            backdrop.classList.remove('opacity-100');
            panel.classList.add('-translate-x-full');
            panel.classList.remove('translate-x-0');
            setTimeout(() => {
                drawer.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            }, 200);
        }

        toggle.addEventListener('click', openDrawer);
        close.addEventListener('click', closeDrawer);
        backdrop.addEventListener('click', closeDrawer);

        drawer.querySelectorAll('a[data-nav-item]').forEach(link => {
            link.addEventListener('click', closeDrawer);
        });
    }

    function applyHeaderContent(shell, config) {
        const title = shell.querySelector('[data-header-title]');
        const subtitle = shell.querySelector('[data-header-subtitle]');
        if (title && config.headerTitle) {
            title.textContent = config.headerTitle;
        }
        if (subtitle && config.headerSubtitle) {
            subtitle.textContent = config.headerSubtitle;
        }
    }

    function initializeShell() {
        const config = window.APP_SHELL_CONFIG || {};
        const content = document.querySelector('[data-page-content]');
        if (!content) {
            return;
        }

        injectStyles();
        const shell = createShell(config);
        const main = shell.querySelector('[data-main-container]');
        main.appendChild(content);

        document.body.innerHTML = '';
        document.body.className = 'bg-slate-100 min-h-screen';
        document.body.appendChild(shell);

        applyActiveNav(shell, config.active || 'dashboard');
        setupUserMenu(shell);
        setupLogout(shell);
        setupMobileNav(shell);
        applyHeaderContent(shell, config);
    }

    document.addEventListener('DOMContentLoaded', initializeShell);
})();
