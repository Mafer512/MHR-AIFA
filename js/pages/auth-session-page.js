window.MHRAuthSessionPage = (function () {
  function init(ctx) {
    var supabase = ctx && ctx.supabase;
                var loginModal = document.getElementById('login-modal');
                var loginBtn = document.getElementById('login-btn');
                var emailInput = document.getElementById('login-email');
                var passInput = document.getElementById('login-password');
                var togglePassBtn = document.getElementById('toggle-password-visibility');
                var errorMsg = document.getElementById('login-error');
                var userInfo = document.getElementById('user-info');
                var userEmailSpan = document.getElementById('user-email');
                var userRoleSpan = document.getElementById('user-role');
                var logoutBtn = document.getElementById('logout-btn');
                var reportForm = document.getElementById('report-form');
                var reportHeader = document.querySelector('.report-header');
                var mainTitle = document.getElementById('main-title');
                
                var AUTH_STORAGE_KEY = 'mhr_current_user';
                
                if (reportForm) reportForm.style.display = 'none';
                if (reportHeader) reportHeader.style.display = 'none';
                if (mainTitle) mainTitle.style.display = 'none';
                document.body.classList.add('loading-auth');
                
                function normalizeText(value) {
                    return String(value || '').trim();
                }
                
                function getUserField(user, names, fallback) {
                    for (var i = 0; i < names.length; i++) {
                        if (user && user[names[i]] !== undefined && user[names[i]] !== null && user[names[i]] !== '') {
                            return user[names[i]];
                        }
                    }
                    return fallback || '';
                }
                
                function saveCurrentUser(user) {
                    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
                    window.currentUser = user;
                }
                
                function getCurrentUser() {
                    try {
                        var raw = localStorage.getItem(AUTH_STORAGE_KEY);
                        return raw ? JSON.parse(raw) : null;
                    } catch (e) {
                        return null;
                    }
                }
                
                function clearCurrentUser() {
                    localStorage.removeItem(AUTH_STORAGE_KEY);
                    window.currentUser = null;
                }
                
                function showLogin() {
                    if (loginModal) loginModal.style.display = 'flex';
                    if (userInfo) userInfo.style.display = 'none';
                    if (reportForm) reportForm.style.display = 'none';
                    if (reportHeader) reportHeader.style.display = 'none';
                    if (mainTitle) mainTitle.style.display = 'none';
                    document.body.classList.add('loading-auth');
                }
                
                function handleUser(user) {
                    if (!user) {
                        showLogin();
                        return;
                    }
                
                    var username =
                        user.username ||
                        user.email ||
                        (user.user_metadata && user.user_metadata.username) ||
                        'Usuario';
                
                    var fullName =
                        user.full_name ||
                        (user.user_metadata && user.user_metadata.full_name) ||
                        username;
                
                    var role =
                        sessionStorage.getItem('user_role') ||
                        user.role ||
                        (user.user_metadata && user.user_metadata.role) ||
                        'viewer';
                
                    if (role === 'authenticated') {
                        role = sessionStorage.getItem('user_role') || 'viewer';
                    }
                
                    role = String(role || 'viewer').trim().toLowerCase();
                    window.mhrCurrentRole = role;
                
                    if (loginModal) loginModal.style.display = 'none';
                    if (userInfo) userInfo.style.display = 'flex';
                    if (userEmailSpan) userEmailSpan.textContent = fullName || username;
                    if (userRoleSpan) userRoleSpan.textContent = role;

                    // Update sidebar avatar initial
                    var avatarEl = document.getElementById('sidebar-user-initial');
                    if (avatarEl) {
                        var displayName = fullName || username || '';
                        avatarEl.textContent = displayName.charAt(0).toUpperCase() || 'U';
                    }

                    if (reportHeader) reportHeader.style.display = 'flex';
                    if (mainTitle) mainTitle.style.display = 'block';
                    document.body.classList.remove('loading-auth');

                    // Auto-cargar todos los datos al iniciar sesión (estadísticas, historiales)
                    if (typeof window.mhrAutoLoadData === 'function') window.mhrAutoLoadData();

                    // Admin popup: show/hide on user section click
                    var adminGroup = document.getElementById('sidebar-group-admin');
                    var popup = document.getElementById('sidebar-admin-popup');
                    var userInfoEl = document.getElementById('user-info');
                    var isAdmin = ['admin', 'superuser', 'superadmin', 'ingenieria'].includes(role);

                    // Keep legacy sidebar-group-admin hidden (not used anymore)
                    if (adminGroup) adminGroup.style.display = 'none';

                    if (isAdmin && popup && userInfoEl) {
                        userInfoEl.classList.add('admin-clickable');
                        userInfoEl.addEventListener('click', function (e) {
                            if (e.target.closest('#logout-btn')) return;
                            var open = popup.style.display !== 'none';
                            popup.style.display = open ? 'none' : 'block';
                            userInfoEl.classList.toggle('admin-open', !open);
                        });
                        // Close popup when clicking outside
                        document.addEventListener('click', function (e) {
                            if (!userInfoEl.contains(e.target) && !popup.contains(e.target)) {
                                popup.style.display = 'none';
                                userInfoEl.classList.remove('admin-open');
                            }
                        });
                        // Adjust popup bottom to match actual user section height
                        setTimeout(function () {
                            var rect = userInfoEl.getBoundingClientRect();
                            popup.style.bottom = (window.innerHeight - rect.top) + 'px';
                        }, 100);
                    } else if (popup) {
                        popup.style.display = 'none';
                    }
                
                    // SUPERADMIN es global: no depende de permisos ni del sistema
                    // seleccionado en las tablas compartidas.
                    var isGlobalSuperadmin = role === 'superadmin';
                    var allowedRoles = [
                        'admin',
                        'editor',
                        'inspector',
                        'superuser',
                        'superadmin',
                        'control_fauna',
                        'servicio_medico',
                        'colab_editor'
                    ];
                
                    if (isGlobalSuperadmin || allowedRoles.includes(role)) {
                        if (reportForm) reportForm.style.display = 'block';
                    } else {
                        if (reportForm) reportForm.style.display = 'none';
                        if (role !== 'ingenieria') {
                            alert('Tu usuario (' + role + ') no tiene permisos para llenar reportes.');
                        }
                    }
                
                    if (window.MHRViewPermissions) window.MHRViewPermissions.aplicar();

                    var adminPanel = document.getElementById('admin-panel');
                    if (adminPanel && ['admin', 'superuser', 'superadmin', 'ingenieria'].includes(role)) {
                        adminPanel.style.display = 'block';
                        if (typeof loadAdminReports === 'function') {
                            loadAdminReports();
                        }
                    }
                }
                
                async function checkSession() {
                    // Siempre pedir credenciales al cargar la página — no restaurar sesión automáticamente
                    clearCurrentUser();
                    showLogin();
                }

                function safeJsonParse(value) {
                    if (!value) return null;
                    if (typeof value === 'object') return value;
                    try { return JSON.parse(value); } catch (_) { return null; }
                }

                function hasRevisionCrearPermission(permisosExtra) {
                    var permisos = safeJsonParse(permisosExtra) || {};
                    var acciones = (permisos && permisos.acciones) || {};
                    var revisionAcciones = acciones['revision-area-movimiento'];
                    if (!Array.isArray(revisionAcciones)) return false;
                    return revisionAcciones.map(function (x) { return String(x || '').toLowerCase(); }).includes('crear');
                }

                function belongsToGsoPath(pertenece) {
                    var perteneceObj = safeJsonParse(pertenece) || {};
                    var path = String((perteneceObj && perteneceObj.path) || '').trim().toLowerCase();
                    return path === 'dg.do.sd_so.gso';
                }

                async function loadRevisionResponsibleOptions() {
                    var select = document.getElementById('report-authors-select');
                    var resetBtn = document.getElementById('report-authors-reset');
                    var roleSelect = document.getElementById('report-role');
                    var roleResetBtn = document.getElementById('report-role-reset');
                    if (!select || !supabase) return;

                    // Get logged-in user data
                    var currentUser = getCurrentUser();
                    var currentUserId = currentUser && currentUser.id;
                    var profile = null;
                    if (currentUserId && window.MHRUserService && window.MHRUserService.getUserProfile) {
                        try { profile = await window.MHRUserService.getUserProfile(supabase, currentUserId); } catch(_) {}
                    }
                    var currentFullName = (profile && profile.full_name) ||
                        (currentUser && (currentUser.full_name || (currentUser.user_metadata && currentUser.user_metadata.full_name))) || '';
                    var currentCargo = (profile && profile.cargo) || '';

                    try {
                        var usuarios = await window.MHRUserService.fetchAppUsuarios(supabase, 'MHR');

                        var usuariosFiltrados = (usuarios || []).filter(function (u) {
                            return belongsToGsoPath(u.pertenece) && hasRevisionCrearPermission(u.permisos_extra);
                        }).map(function (u) {
                            return (
                                u.full_name ||
                                u.nombre_completo ||
                                u.nombre ||
                                u.name ||
                                u.username ||
                                ''
                            ).trim();
                        }).filter(Boolean).sort(function (a, b) {
                            return a.localeCompare(b, 'es', { sensitivity: 'base' });
                        });

                        // Ensure current user's name is in the list
                        if (currentFullName && usuariosFiltrados.indexOf(currentFullName) < 0) {
                            usuariosFiltrados.unshift(currentFullName);
                        }

                        select.innerHTML = '<option value="" disabled selected>-- Seleccionar Responsable --</option>';
                        usuariosFiltrados.forEach(function (nombre) {
                            var option = document.createElement('option');
                            option.value = nombre;
                            option.textContent = nombre;
                            select.appendChild(option);
                        });

                        // Auto-select current user and lock
                        if (currentFullName) {
                            select.value = currentFullName;
                            select.disabled = true;
                            if (resetBtn) resetBtn.style.display = 'none';
                        }

                        // Sellar responsable y cargo en todos los formularios
                        // con la identidad de la sesión (ver identity-lock.js).
                        if (window.MHRIdentity) window.MHRIdentity.aplicar(true);

                        // Ocultar del menú las vistas sin permiso y dejar en
                        // sólo lectura las que no permiten capturar.
                        if (window.MHRViewPermissions) window.MHRViewPermissions.aplicar();

                        // Auto-fill cargo and lock
                        if (currentCargo && roleSelect) {
                            // Try to match existing option
                            var matched = false;
                            for (var i = 0; i < roleSelect.options.length; i++) {
                                if (roleSelect.options[i].text.trim().toLowerCase() === currentCargo.trim().toLowerCase() ||
                                    roleSelect.options[i].value.trim().toLowerCase() === currentCargo.trim().toLowerCase()) {
                                    roleSelect.selectedIndex = i;
                                    matched = true;
                                    break;
                                }
                            }
                            if (!matched) {
                                // Add as custom option
                                var opt = document.createElement('option');
                                opt.value = currentCargo;
                                opt.textContent = currentCargo;
                                roleSelect.appendChild(opt);
                                roleSelect.value = currentCargo;
                            }
                            roleSelect.disabled = true;
                            if (roleResetBtn) roleResetBtn.style.display = 'none';
                        }

                    } catch (e) {
                        console.error('No se pudo cargar responsables desde vw_app_usuarios:', e);
                    }
                }
                
                async function loginWithUsuariosTable(usernameOrEmail, password) {
                    var userValue = String(usernameOrEmail || '').trim();
                    var passValue = String(password || '').trim();
                
                    if (!userValue || !passValue) {
                        throw new Error('Captura usuario y contraseña.');
                    }
                
                    var user = await window.MHRUserService.findUsuarioByUsernameOrEmail(supabase, userValue);

                    if (!user) {
                        throw new Error('Usuario no encontrado.');
                    }
                
                    if (user.estatus && String(user.estatus).toLowerCase() === 'baja') {
                        throw new Error('El usuario está dado de baja.');
                    }
                
                    if (String(user.password || '') !== String(passValue)) {
                        throw new Error('Credenciales incorrectas.');
                    }
                
                    sessionStorage.setItem('user_role', user.role || 'viewer');
                    sessionStorage.setItem('username', user.username || '');
                    sessionStorage.setItem('user_email', user.email || '');
                    sessionStorage.setItem('user_full_name', user.full_name || user.username || '');
                
                    return user;
                }
                

                if (togglePassBtn && passInput) {
                    // Ojo: la contraseña está oculta (pulsar para mostrarla).
                    // Ojo tachado: está a la vista (pulsar para ocultarla).
                    var SVG_ABRE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" ' +
                        'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
                        'stroke-linejoin="round" aria-hidden="true">' +
                        '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
                        '<circle cx="12" cy="12" r="3"/></svg>';
                    var SVG_TACHADO = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" ' +
                        'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
                        'stroke-linejoin="round" aria-hidden="true">' +
                        '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94"/>' +
                        '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>' +
                        '<path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>' +
                        '<line x1="2" y1="2" x2="22" y2="22"/></svg>';

                    togglePassBtn.addEventListener('click', function () {
                        var isPassword = passInput.type === 'password';
                        passInput.type = isPassword ? 'text' : 'password';
                        togglePassBtn.setAttribute('aria-pressed', String(isPassword));
                        togglePassBtn.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
                        togglePassBtn.title = isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña';
                        togglePassBtn.innerHTML = isPassword ? SVG_TACHADO : SVG_ABRE;
                    });

                    passInput.addEventListener('keydown', function (event) {
                        if (event.key === 'Enter' && loginBtn && !loginBtn.disabled) {
                            event.preventDefault();
                            loginBtn.click();
                        }
                    });
                }

                if (emailInput) {
                    emailInput.addEventListener('keydown', function (event) {
                        if (event.key === 'Enter' && loginBtn && !loginBtn.disabled) {
                            event.preventDefault();
                            loginBtn.click();
                        }
                    });
                }

                // Native form submit — handles Enter key reliably on first load
                var loginForm = document.getElementById('login-form');
                if (loginForm) {
                    loginForm.addEventListener('submit', function (event) {
                        event.preventDefault();
                        if (loginBtn && !loginBtn.disabled) {
                            loginBtn.click();
                        }
                    });
                }

                // Global Enter listener: fires whenever the login modal is visible,
                // regardless of which element has focus (covers autofill cases).
                document.addEventListener('keydown', function (event) {
                    if (event.key !== 'Enter') return;
                    if (!loginModal || loginModal.style.display === 'none') return;
                    if (loginBtn && !loginBtn.disabled) {
                        event.preventDefault();
                        loginBtn.click();
                    }
                });

                if (loginBtn) {
                    loginBtn.addEventListener('click', async function () {
                
                        const originalUsername = (emailInput.value || '').trim();
                        let email = originalUsername;
                        const password = passInput.value || '';
                
                        errorMsg.style.display = 'none';
                        loginBtn.disabled = true;
                        loginBtn.textContent = 'Entrando...';
                
                        try {
                
                            if (email && !email.includes('@')) {
                                // Look up the real auth email by username
                                try {
                                    var lookupRes = await supabase.rpc('get_email_by_username', { p_username: email });
                                    if (!lookupRes.error && lookupRes.data) {
                                        email = lookupRes.data;
                                    } else {
                                        // Fallback: derive from username
                                        const normalized = email
                                            .trim()
                                            .toLowerCase()
                                            .normalize("NFD")
                                            .replace(/[\u0300-\u036f]/g, "")
                                            .replace(/\s+/g, '.');
                                        email = `${normalized}@aifa.operaciones`;
                                    }
                                } catch (_) {
                                    const normalized = email
                                        .trim()
                                        .toLowerCase()
                                        .normalize("NFD")
                                        .replace(/[\u0300-\u036f]/g, "")
                                        .replace(/\s+/g, '.');
                                    email = `${normalized}@aifa.operaciones`;
                                }
                            }
                
                            var { data, error } = await supabase.auth.signInWithPassword({
                                email: email,
                                password: password
                            });
                
                            if (error) throw error;

                            // La autenticación es compartida con AIFA Operaciones.
                            // Tener una cuenta en auth.users no implica acceso a MHR.
                            // Validar la membresía antes de cargar cualquier módulo.
                            var mhrAppCheck = await supabase.from('aplicaciones')
                                .select('id').eq('clave', 'MHR').maybeSingle();
                            if (mhrAppCheck.error || !mhrAppCheck.data) {
                                await supabase.auth.signOut();
                                throw new Error('No se pudo validar el acceso al aplicativo MHR.');
                            }
                            var mhrMembership = await supabase.from('usuarios_aplicaciones')
                                .select('rol, estado')
                                .eq('usuario_id', data.user.id)
                                .eq('aplicacion_id', mhrAppCheck.data.id)
                                .eq('estado', 'ACTIVO').maybeSingle();
                            var globalRole = await supabase.from('user_roles')
                                .select('role').eq('user_id', data.user.id).maybeSingle();
                            var globalRoleName = String((globalRole.data && globalRole.data.role) || '').toLowerCase();
                            var isGlobalMhrUser = globalRoleName === 'superuser' || globalRoleName === 'superadmin';
                            if (mhrMembership.error || (!mhrMembership.data && !isGlobalMhrUser)) {
                                await supabase.auth.signOut();
                                throw new Error('Tu usuario no tiene acceso asignado al aplicativo MHR.');
                            }

                            sessionStorage.setItem('user', JSON.stringify(data.user));
                            sessionStorage.setItem('token', data.session.access_token);
                
                            let role = 'viewer';
                
                            try {
                                const userRole = await window.MHRUserService.getUserRole(supabase, data.user.id);
                                if (userRole) {
                                    role = userRole;
                                }
                
                            } catch (_) {}
                
                            sessionStorage.setItem('user_role', role);

                            var userToSave = Object.assign({}, data.user, {
                                role: role,
                                user_metadata: Object.assign({}, data.user.user_metadata || {}, { role: role })
                            });
                            saveCurrentUser(userToSave);

                            handleUser(userToSave);
                            loadRevisionResponsibleOptions();
                
                        } catch (error) {
                
                            errorMsg.textContent = 'Error: ' + error.message;
                            errorMsg.style.display = 'block';
                
                        } finally {
                
                            loginBtn.disabled = false;
                            loginBtn.textContent = 'Iniciar Sesión';
                
                        }
                
                    });
                }
                
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', function () {
                        clearCurrentUser();
                        location.reload();
                    });
                }

                setTimeout(function () {
                    loadRevisionResponsibleOptions();
                }, 800);
                
                checkSession();
  }
  return { init: init };
})();
