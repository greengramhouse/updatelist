
        // ==========================================
        // CONFIGURATION
        // ==========================================
        const API_URL = "https://script.google.com/macros/s/AKfycbyqRmFyGrvR_mZQxxyElTPsxS8dqcldScPWG7LpDt7BI6W2z1IrICf-FIda1D938IIk/exec"; 
        
        // ==========================================
        // STATE MANAGEMENT
        // ==========================================
        let currentUser = null;
        let currentRole = null;
        let currentRoom = null;
        let studentsData = [];
        let arrangeData = [];
        let allRoomsList = [];
        let chartInstance = null;
        let overviewChartInstance = null;
        
        // ==========================================
        // DOM ELEMENTS
        // ==========================================
        const themeToggle = document.getElementById('themeToggle');
        const html = document.documentElement;
        
        const sections = {
            login: document.getElementById('loginSection'),
            data: document.getElementById('dataSection'),
            summary: document.getElementById('summarySection'),
            overview: document.getElementById('overviewSection'),
            settings: document.getElementById('settingsSection'), 
            arrange: document.getElementById('arrangeSection'),
            note: document.getElementById('noteSection')
        };
        
        const ui = {
            sidebar: document.getElementById('sidebar'),
            sidebarOverlay: document.getElementById('sidebarOverlay'),
            btnHamburger: document.getElementById('btnHamburger'),
            sidebarUserName: document.getElementById('sidebarUserName'),
            sidebarUserRole: document.getElementById('sidebarUserRole'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingText: document.getElementById('loadingText'),
            classroomTable: document.getElementById('classroomTable'),
            classroomTableBody: document.getElementById('classroomTableBody'),
            roomTitle: document.getElementById('roomTitle'),
            roomSelector: document.getElementById('roomSelector'),
            searchInput: document.getElementById('searchInput'),
            noResultMsg: document.getElementById('noResultMsg'),
            btnSave: document.getElementById('btnSave'),
            
            // ADMIN UI
            settingsRoomsList: document.getElementById('settingsRoomsList'),
            settingsUsersList: document.getElementById('settingsUsersList'),
            arrangeFilterRoom: document.getElementById('arrangeFilterRoom'),
            arrangeTargetRoom: document.getElementById('arrangeTargetRoom'),
            arrangeTableBody: document.getElementById('arrangeTableBody'),
            arrangeSelectAll: document.getElementById('arrangeSelectAll'),
            btnSaveArrangement: document.getElementById('btnSaveArrangement')
        };

        const guideModal = {
            container: document.getElementById('guideModal'),
            content: document.getElementById('guideModalContent')
        };

        // ==========================================
        // INITIALIZATION
        // ==========================================
        document.addEventListener('DOMContentLoaded', () => {
            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                html.classList.add('dark');
                document.getElementById('icon-sun').classList.remove('hidden');
                document.getElementById('icon-moon').classList.add('hidden');
            }

            themeToggle.addEventListener('click', toggleTheme);
            document.getElementById('loginForm').addEventListener('submit', handleLogin);
            ui.btnSave.addEventListener('click', saveData);
            ui.roomSelector.addEventListener('change', (e) => switchRoom(e.target.value));
            ui.searchInput.addEventListener('input', filterStudents);
            
            // Admin Listeners
            ui.arrangeSelectAll.addEventListener('change', toggleSelectAllArrange);
            ui.arrangeFilterRoom.addEventListener('change', renderArrangeTable);
            ui.btnSaveArrangement.addEventListener('click', saveArrangement);
        });

        function toggleTheme() {
            html.classList.toggle('dark');
            const isDark = html.classList.contains('dark');
            localStorage.theme = isDark ? 'dark' : 'light';
            document.getElementById('icon-sun').classList.toggle('hidden', !isDark);
            document.getElementById('icon-moon').classList.toggle('hidden', isDark);
            
            if (chartInstance) {
                chartInstance.options.plugins.legend.labels.color = isDark ? '#e5e7eb' : '#475569';
                chartInstance.update();
            }
            if (overviewChartInstance) {
                overviewChartInstance.options.plugins.legend.labels.color = isDark ? '#e5e7eb' : '#475569';
                overviewChartInstance.update();
            }
        }

        // Sidebar Toggle Logic
        function toggleSidebar() {
            ui.sidebar.classList.toggle('mobile-open');
            ui.sidebarOverlay.classList.toggle('hidden');
        }

        function toggleSidebarDesktop() {
            ui.sidebar.classList.toggle('sidebar-collapsed');
            const icon = document.getElementById('collapseIcon');
            if (ui.sidebar.classList.contains('sidebar-collapsed')) {
                icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>`;
            } else {
                icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>`;
            }
        }

        // ==========================================
        // API COMMUNICATION
        // ==========================================
        async function fetchAPI(payload) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                return await response.json();
            } catch (error) {
                console.error("API Error:", error);
                throw error;
            }
        }

        // ==========================================
        // LOGIC FUNCTIONS
        // ==========================================
        async function handleLogin(e) {
            e.preventDefault();
            const user = document.getElementById('username').value;
            const pass = document.getElementById('password').value;
            
            const btn = document.getElementById('btnLogin');
            const text = document.getElementById('loginText');
            const spin = document.getElementById('loginSpinner');
            
            btn.disabled = true;
            text.classList.add('hidden');
            spin.classList.remove('hidden');

            try {
                const res = await fetchAPI({ action: 'login', username: user, password: pass });
                
                if (res.status === 'success') {
                    currentUser = res.user;
                    currentRole = res.role;
                    currentRoom = res.room;
                    studentsData = res.students || [];

                    setupUI();
                    
                    if (currentRole === 'admin' && res.allRooms) {
                        allRoomsList = res.allRooms;
                        ui.roomSelector.innerHTML = res.allRooms.map(r => `<option value="${r}">${r}</option>`).join('');
                        ui.roomSelector.classList.remove('hidden');
                        if (res.allRooms.length > 0) currentRoom = res.allRooms[0];
                        
                        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
                    }

                    ui.searchInput.value = '';
                    renderClassroom();
                    switchMenu('data'); 
                    
                    ui.sidebar.classList.remove('hidden');
                    ui.btnHamburger.classList.remove('hidden');

                    openGuideModal();
                    
                } else {
                    Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.message, icon: 'error', confirmButtonColor: '#3b82f6' });
                }
            } catch (err) {
                Swal.fire({ title: 'เชื่อมต่อล้มเหลว', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', icon: 'error', confirmButtonColor: '#3b82f6' });
            } finally {
                btn.disabled = false;
                text.classList.remove('hidden');
                spin.classList.add('hidden');
            }
        }

        async function switchRoom(room) {
            showLoading('กำลังโหลดข้อมูลห้อง ' + room);
            try {
                const res = await fetchAPI({ action: 'switchRoom', room: room });
                if (res.status === 'success') {
                    currentRoom = res.room;
                    studentsData = res.students || [];
                    ui.searchInput.value = '';
                    renderClassroom();
                } else {
                    Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.message, icon: 'error', confirmButtonColor: '#3b82f6' });
                }
            } catch (err) {
                Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'โหลดข้อมูลไม่สำเร็จ', icon: 'error', confirmButtonColor: '#3b82f6' });
            } finally {
                hideLoading();
            }
        }

        async function saveData() {
            showLoading('กำลังเก็บบันทึกข้อมูล...');
            try {
                const payload = {
                    action: 'saveData',
                    room: currentRoom,
                    data: studentsData
                };

                const res = await fetchAPI(payload);
                
                if (res.status === 'success') {
                    Swal.fire({
                        title: 'บันทึกสำเร็จ!',
                        text: 'ขอบคุณที่ดำเนินการอัปเดตข้อมูลนักเรียนครับ',
                        icon: 'success',
                        confirmButtonText: 'ดูสถิติห้อง',
                        confirmButtonColor: '#10b981',
                        allowOutsideClick: false
                    }).then((result) => {
                        if (result.isConfirmed) {
                            renderSummary();
                            showSection('summary');
                        }
                    });

                } else {
                    Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.message, icon: 'error', confirmButtonColor: '#3b82f6' });
                }
            } catch (err) {
                Swal.fire({ title: 'บันทึกไม่สำเร็จ', text: 'เกิดข้อผิดพลาดระหว่างการเชื่อมต่อ', icon: 'error', confirmButtonColor: '#3b82f6' });
            } finally {
                hideLoading();
            }
        }

        // ==========================================
        // SUBMIT NOTE / REMARK
        // ==========================================
        async function submitNote() {
            const msgInput = document.getElementById('noteMessage');
            const message = msgInput.value.trim();

            if (!message) {
                Swal.fire({title: 'แจ้งเตือน', text: 'กรุณากรอกข้อความก่อนกดส่ง', icon: 'warning', confirmButtonColor: '#f59e0b'});
                return;
            }

            showLoading('กำลังส่งข้อมูล...');
            try {
                const payload = {
                    action: 'submitNote',
                    user: currentUser ? currentUser.name : 'Unknown',
                    room: currentRoom || 'Unknown',
                    message: message
                };

                const res = await fetchAPI(payload);

                if (res.status === 'success') {
                    Swal.fire({title: 'สำเร็จ', text: 'ส่งข้อมูลรายละเอียดเรียบร้อยแล้ว', icon: 'success', confirmButtonColor: '#10b981'});
                    msgInput.value = ''; // เคลียร์ช่องพิมพ์
                } else {
                    Swal.fire({title: 'ข้อผิดพลาด', text: res.message, icon: 'error', confirmButtonColor: '#ef4444'});
                }
            } catch (err) {
                Swal.fire({title: 'ข้อผิดพลาด', text: 'ไม่สามารถส่งข้อความได้ กรุณาลองใหม่', icon: 'error', confirmButtonColor: '#ef4444'});
            } finally {
                hideLoading();
            }
        }

        // ==========================================
        // UI RENDERING & CLASSROOM LOGIC
        // ==========================================

        function getRoomLevelInfo(roomName) {
            if (!roomName) return { prefix: "", num: 0, isGrad: false };
            let prefix = "";
            let num = 0;
            const match = roomName.match(/(อ\.|อนุบาล\s*|ป\.|ประถม\s*|ม\.|มัธยม\s*)(\d)/);
            if (match) {
                prefix = match[1].replace(/\s+/g, '');
                num = parseInt(match[2]);
            }
            const isGrad = /(อ\.?3|ป\.?6|ม\.?3|อนุบาล\s*3|ประถม.*\s*6|มัธยม.*\s*3)/i.test(roomName);
            return { prefix, num, isGrad };
        }

        function setupUI() {
            ui.sidebarUserName.textContent = currentUser.name;
            ui.sidebarUserRole.textContent = currentRole === 'admin' ? 'Administrator' : `ห้องเรียน ${currentUser.room}`;
            ui.roomTitle.textContent = `ห้องเรียน ${currentRoom}`;
        }

        function getStatusTheme(status, isSelected) {
            if (!isSelected) {
                return 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400';
            }
            switch(status) {
                case 'เลื่อนชั้น': return 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/30 ring-2 ring-blue-200 dark:ring-blue-900';
                case 'สำเร็จการศึกษา': return 'bg-purple-500 text-white border-purple-500 shadow-md shadow-purple-500/30 ring-2 ring-purple-200 dark:ring-purple-900';
                case 'ซ้ำชั้น': return 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/30 ring-2 ring-amber-200 dark:ring-amber-900';
                case 'ย้าย/ลาออก': return 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/30 ring-2 ring-rose-200 dark:ring-rose-900';
                case 'รอจำหน่าย': return 'bg-zinc-600 text-white border-zinc-600 shadow-md shadow-zinc-500/30 ring-2 ring-zinc-200 dark:ring-zinc-900';
                default: return 'bg-slate-500 text-white border-slate-500';
            }
        }

        function getRowBackgroundClass(status) {
            switch(status) {
                case 'เลื่อนชั้น': return 'hover:bg-blue-50/80 dark:hover:bg-blue-900/20 md:border-l-[4px] md:border-l-blue-500 border-l-[6px] border-l-blue-500';
                case 'สำเร็จการศึกษา': return 'hover:bg-purple-50/80 dark:hover:bg-purple-900/20 md:border-l-[4px] md:border-l-purple-500 border-l-[6px] border-l-purple-500';
                case 'ซ้ำชั้น': return 'hover:bg-amber-50/80 dark:hover:bg-amber-900/20 md:border-l-[4px] md:border-l-amber-500 border-l-[6px] border-l-amber-500';
                case 'ย้าย/ลาออก': return 'hover:bg-rose-50/80 dark:hover:bg-rose-900/20 md:border-l-[4px] md:border-l-rose-500 border-l-[6px] border-l-rose-500';
                case 'รอจำหน่าย': return 'hover:bg-zinc-50/80 dark:hover:bg-zinc-900/20 md:border-l-[4px] md:border-l-zinc-500 border-l-[6px] border-l-zinc-500 grayscale-[0.3] opacity-90';
                default: return 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50 md:border-l-[4px] md:border-l-transparent border-l-[6px] border-l-transparent';
            }
        }

        function getSubStatusOptionsHTML(roomInfo, currentSubStatus) {
            let currentGradeText = `${roomInfo.prefix}${roomInfo.num}`;
            let gradOptions = `<option value="">-- ระบุสถานที่เรียนต่อ --</option>`;
            
            if (currentGradeText.includes("อ") || currentGradeText.includes("3")) {
                gradOptions += `
                    <option value="ต่อ ป.1 (โรงเรียนเดิม)" ${currentSubStatus === 'ต่อ ป.1 (โรงเรียนเดิม)' ? 'selected' : ''}>เรียนต่อ ป.1 (โรงเรียนเดิม)</option>
                    <option value="ต่อ ป.1 (โรงเรียนใหม่)" ${currentSubStatus === 'ต่อ ป.1 (โรงเรียนใหม่)' ? 'selected' : ''}>ย้ายไปเรียนต่อ ป.1 (ที่อื่น)</option>`;
            } else if (currentGradeText.includes("ป") || currentGradeText.includes("6")) {
                gradOptions += `
                    <option value="ต่อ ม.1 (โรงเรียนเดิม)" ${currentSubStatus === 'ต่อ ม.1 (โรงเรียนเดิม)' ? 'selected' : ''}>เรียนต่อ ม.1 (โรงเรียนเดิม)</option>
                    <option value="ต่อ ม.1 (โรงเรียนใหม่)" ${currentSubStatus === 'ต่อ ม.1 (โรงเรียนใหม่)' ? 'selected' : ''}>ย้ายไปเรียนต่อ ม.1 (ที่อื่น)</option>`;
            } else {
                gradOptions += `
                    <option value="ศึกษาต่อโรงเรียนเดิม" ${currentSubStatus === 'ศึกษาต่อโรงเรียนเดิม' ? 'selected' : ''}>ศึกษาต่อโรงเรียนเดิม</option>
                    <option value="ย้ายโรงเรียน/อื่นๆ" ${currentSubStatus === 'ย้ายโรงเรียน/อื่นๆ' ? 'selected' : ''}>ย้ายโรงเรียน/อื่นๆ</option>`;
            }
            return gradOptions;
        }

        function renderClassroom() {
            ui.roomTitle.textContent = `ห้องเรียน ${currentRoom}`;
            ui.classroomTableBody.innerHTML = '';
            
            if (studentsData.length === 0) {
                ui.classroomTableBody.innerHTML = `<tr><td colspan="5" class="px-3 py-12 text-center text-slate-500 font-bold text-base sm:text-lg bg-white dark:bg-darkcard rounded-xl border border-slate-200 dark:border-slate-800 md:border-none">ไม่มีรายชื่อนักเรียนในห้องนี้</td></tr>`;
                return;
            }

            const roomInfo = getRoomLevelInfo(currentRoom);
            const isGrad = roomInfo.isGrad;
            const isM3 = roomInfo.prefix.includes("ม") && roomInfo.num === 3;
            let nextGradeText = roomInfo.prefix ? `${roomInfo.prefix}${roomInfo.num + 1}` : 'เลื่อนชั้น';

            const statusOptions = isGrad 
                ? [
                    { value: 'สำเร็จการศึกษา', label: 'สำเร็จการศึกษา' },
                    { value: 'ซ้ำชั้น', label: 'ซ้ำชั้น' },
                    { value: 'ย้าย/ลาออก', label: 'ย้าย/ลาออก' },
                    { value: 'รอจำหน่าย', label: 'รอจำหน่าย' }
                ]
                : [
                    { value: 'เลื่อนชั้น', label: 'เลื่อนชั้น' },
                    { value: 'ซ้ำชั้น', label: 'ซ้ำชั้น' },
                    { value: 'ย้าย/ลาออก', label: 'ย้าย/ลาออก' },
                    { value: 'รอจำหน่าย', label: 'รอจำหน่าย' }
                ];

            studentsData.forEach((student, index) => {
                if (!isGrad && student.status === 'สำเร็จการศึกษา') {
                    student.status = 'เลื่อนชั้น';
                    student.subStatus = '';
                }
                if (!student.status) student.status = isGrad ? 'สำเร็จการศึกษา' : 'เลื่อนชั้น';

                let detailText = '';
                if (student.status === 'เลื่อนชั้น') detailText = `<span class="text-blue-600 dark:text-blue-400 font-semibold">ขึ้น ${nextGradeText}</span>`;
                else if (student.status === 'ซ้ำชั้น') detailText = `<span class="text-amber-600 dark:text-amber-400 font-semibold">เรียนซ้ำเดิม</span>`;
                else if (student.status === 'ย้าย/ลาออก') detailText = `<span class="text-rose-600 dark:text-rose-400 font-semibold">ย้ายออก</span>`;
                else if (student.status === 'รอจำหน่าย') detailText = `<span class="text-zinc-500 dark:text-zinc-400 font-semibold">รอจำหน่าย</span>`;
                else if (student.status === 'สำเร็จการศึกษา') {
                    if (isM3) detailText = '<span class="text-purple-600 dark:text-purple-400 font-semibold">จบ ม.3</span>';
                    else if (student.subStatus) {
                        if(student.subStatus.includes('เดิม')) detailText = '<span class="text-purple-600 dark:text-purple-400 font-semibold">ต่อที่เดิม</span>';
                        else if(student.subStatus.includes('ใหม่')) detailText = '<span class="text-purple-600 dark:text-purple-400 font-semibold">ย้ายที่ใหม่</span>';
                        else detailText = '<span class="text-orange-500 font-semibold">กรุณาระบุที่เรียน</span>';
                    } else {
                        detailText = '<span class="text-orange-500 font-semibold">ยังไม่ระบุที่เรียน</span>';
                    }
                }

                const rowBg = getRowBackgroundClass(student.status);
                const row = document.createElement('tr');
                
                // นำคลาส Responsive มาใช้ตรงนี้ (เปลี่ยนจาก tr ปกติ ให้กลายเป็น block/card บนมือถือ)
                row.className = `student-row block md:table-row bg-white dark:bg-darkcard border border-slate-100 dark:border-slate-800 md:border-none rounded-2xl md:rounded-none shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] md:shadow-none overflow-hidden transition-all duration-300 md:border-b md:border-slate-100 md:dark:border-slate-800/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transform md:hover:-translate-y-0 group relative ${rowBg}`;
                row.dataset.searchstr = `${student.id} ${student.name} ${student.surname}`.toLowerCase();
                row.dataset.status = student.status || '';
                row.dataset.substatus = student.subStatus || '';
                
                const radioHtml = statusOptions.map(option => {
                    const isSelected = student.status === option.value;
                    const theme = getStatusTheme(option.value, isSelected);
                    return `
                        <label class="relative cursor-pointer inline-flex items-center group/btn">
                            <input type="radio" name="status_${index}" value="${option.value}" class="peer sr-only status-radio" ${isSelected ? 'checked' : ''}>
                            <div class="px-3 md:px-4 py-2 rounded-xl text-[11px] md:text-sm font-bold transition-all duration-300 border select-none flex items-center justify-center ${theme} peer-focus:ring-2 peer-focus:ring-primary group-hover/btn:scale-105 active:scale-95 shadow-sm">
                                ${option.label}
                            </div>
                        </label>
                    `;
                }).join('');

                const showSubStatus = (student.status === 'สำเร็จการศึกษา' && !isM3);
                const subStatusHtml = showSubStatus ? `
                    <div class="mt-3 w-full animate-[modalFadeIn_0.2s_ease-out_forwards]">
                        <select class="sub-status-select w-full text-xs md:text-sm font-bold text-purple-900 dark:text-purple-100 bg-purple-50/90 dark:bg-purple-900/30 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-800/50 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-400 outline-none p-2.5 cursor-pointer shadow-sm transition-all hover:bg-purple-100/50">
                            ${getSubStatusOptionsHTML(roomInfo, student.subStatus)}
                        </select>
                    </div>` : '';

                row.innerHTML = `
                    <!-- Mobile Header (แสดงเฉพาะบนมือถือ ซ่อนบน Desktop) -->
                    <td class="md:hidden flex justify-between items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20 rounded-t-2xl">
                        <span class="font-bold text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-100 dark:border-slate-700">ลำดับที่ ${index + 1}</span>
                        <span class="font-mono text-xs text-slate-500 dark:text-slate-400 font-bold bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-100 dark:border-slate-700">รหัส: ${student.id}</span>
                    </td>

                    <!-- Desktop ลำดับ & รหัส -->
                    <td class="hidden md:table-cell px-4 py-5 whitespace-nowrap text-center text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors group-hover:text-primary">${index + 1}</td>
                    <td class="hidden md:table-cell px-4 py-5 whitespace-nowrap text-center text-sm font-mono text-slate-500 dark:text-slate-400"><span class="bg-slate-50 dark:bg-slate-800 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 font-bold">${student.id}</span></td>

                    <!-- ชื่อ-นามสกุล -->
                    <td class="block md:table-cell px-4 py-5 border-b border-slate-100 dark:border-slate-800 md:border-none lg:w-1/4">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-10 w-10 md:h-12 md:w-12">
                                <div class="h-full w-full rounded-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-50 dark:from-blue-900/60 dark:to-indigo-900/40 shadow-inner border border-blue-200 dark:border-blue-700/50 text-blue-600 dark:text-blue-300 group-hover:scale-110 transition-transform duration-300">
                                    <svg class="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div class="ml-3 md:ml-4">
                                <div class="text-sm md:text-sm font-extrabold text-slate-800 dark:text-white drop-shadow-sm group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">
                                    ${student.title}${student.name} ${student.surname}
                                </div>
                            </div>
                        </div>
                    </td>

                    <!-- สถานะ -->
                    <td class="block md:table-cell px-4 py-5 border-b border-slate-100 dark:border-slate-800 md:border-none md:bg-transparent">
                        <span class="md:hidden block font-bold text-xs text-slate-500 dark:text-slate-400 mb-3 ml-1 flex items-center"><svg class="w-4 h-4 mr-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> อัปเดตสถานะ:</span>
                        <div class="flex flex-wrap gap-2 w-full justify-center md:items-center">
                            ${radioHtml}
                        </div>
                        ${subStatusHtml}
                    </td>

                    <!-- รายละเอียด -->
                    <td class="flex md:table-cell justify-between items-center px-4 py-4 md:py-5 text-sm md:text-base bg-slate-50/30 md:bg-transparent rounded-b-2xl md:rounded-none text-center">
                        <span class="md:hidden font-bold text-xs text-slate-500 dark:text-slate-400">สรุปข้อมูล:</span>
                        <div class="px-3 py-1.5 md:inline-block rounded-lg md:bg-white md:dark:bg-slate-800 md:shadow-sm md:border border-slate-100 dark:border-slate-700">${detailText}</div>
                    </td>
                `;

                const radios = row.querySelectorAll('.status-radio');
                radios.forEach(radio => {
                    radio.addEventListener('change', (e) => {
                        if (e.target.checked) updateStudentStatus(index, e.target.value);
                    });
                });

                const subStatusSelect = row.querySelector('.sub-status-select');
                if (subStatusSelect) {
                    subStatusSelect.addEventListener('change', (e) => {
                        updateStudentSubStatus(index, e.target.value);
                    });
                }

                ui.classroomTableBody.appendChild(row);
            });
            
            if (ui.searchInput.value) {
                ui.searchInput.dispatchEvent(new Event('input'));
            }
        }

        function updateStudentStatus(index, newStatus) {
            studentsData[index].status = newStatus;
            if (newStatus !== 'สำเร็จการศึกษา') {
                studentsData[index].subStatus = '';
            }
            renderClassroom();
        }

        function updateStudentSubStatus(index, newSubStatus) {
            studentsData[index].subStatus = newSubStatus;
            renderClassroom();
        }

        function filterStudents(e) {
            const term = (e ? e.target.value : ui.searchInput.value).toLowerCase();
            const rows = document.querySelectorAll('.student-row');
            let hasVisible = false;
            
            rows.forEach(row => {
                if (row.dataset.searchstr.includes(term)) {
                    row.style.display = '';
                    hasVisible = true;
                } else {
                    row.style.display = 'none';
                }
            });
            
            document.getElementById('noResultTbody').classList.toggle('hidden', hasVisible || rows.length === 0);
        }

        function filterByStatus(status, subStatus = '') {
            const container = document.getElementById('summaryFilteredListContainer');
            const tbody = document.getElementById('summaryFilteredTbody');
            const title = document.getElementById('summaryFilteredTitle');
            
            container.classList.remove('hidden');
            
            let txt = status;
            if (subStatus === 'เดิม') txt += ' (ต่อที่เดิม)';
            if (subStatus === 'ย้าย') txt += ' (ย้ายที่เรียน)';
            title.textContent = txt;
            
            tbody.innerHTML = '';
            
            let count = 0;
            studentsData.forEach((student) => {
                let match = false;
                if (student.status === status) {
                    if (status === 'สำเร็จการศึกษา' && subStatus) {
                        const sSub = String(student.subStatus || '');
                        if (subStatus === 'เดิม' && sSub.includes('เดิม')) match = true;
                        else if (subStatus === 'ย้าย' && !sSub.includes('เดิม')) match = true;
                    } else {
                        match = true;
                    }
                }
                
                if (match) {
                    count++;
                    const tr = document.createElement('tr');
                    tr.className = "hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors bg-white dark:bg-transparent";
                    tr.innerHTML = `
                        <td class="px-4 py-3 text-sm font-bold text-slate-500 text-center">${count}</td>
                        <td class="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-400 text-center"><span class="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">${student.id}</span></td>
                        <td class="px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-200">${student.title}${student.name} ${student.surname}</td>
                    `;
                    tbody.appendChild(tr);
                }
            });
            
            if (count === 0) {
                tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-8 text-center text-slate-500 bg-white dark:bg-transparent border-none">ไม่พบข้อมูลนักเรียนสถานะนี้</td></tr>`;
            }
            
            setTimeout(() => {
                container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 50);
        }

        // ==========================================
        // OVERVIEW LOGIC 
        // ==========================================
        async function loadOverviewData() {
            showLoading('กำลังโหลดข้อมูลภาพรวม...');
            try {
                const res = await fetchAPI({ action: 'getOverview' });
                if (res.status === 'success') {
                    renderOverviewUI(res.stats, res.pendingRooms, res.roomStats);
                } else {
                    Swal.fire({ title: 'ข้อผิดพลาด', text: res.message || 'ไม่สามารถโหลดข้อมูลได้', icon: 'error', confirmButtonColor: '#3b82f6' });
                    switchMenu('data');
                }
            } catch(err) {
                 Swal.fire({ title: 'ข้อผิดพลาด', text: 'การเชื่อมต่อล้มเหลว', icon: 'error', confirmButtonColor: '#3b82f6' });
                 switchMenu('data');
            } finally {
                hideLoading();
            }
        }

        function renderOverviewUI(stats, pendingRooms, roomStats) {
            document.getElementById('ovTotal').textContent = stats.totalStudents.toLocaleString();
            document.getElementById('ovUpdated').textContent = stats.updatedStudents.toLocaleString();
            document.getElementById('ovPendingRoomsCount').textContent = pendingRooms.length;

            const missingList = document.getElementById('missingRoomsList');
            const allUpdatedMsg = document.getElementById('allUpdatedMessage');
            missingList.innerHTML = '';
            
            if (pendingRooms.length > 0) {
                missingList.classList.remove('hidden');
                allUpdatedMsg.classList.add('hidden');
                
                pendingRooms.forEach(room => {
                    const chip = document.createElement('div');
                    chip.className = "px-3 py-1.5 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 text-sm font-bold rounded-lg border border-rose-100 dark:border-rose-800 shadow-sm flex items-center";
                    chip.innerHTML = `<svg class="w-4 h-4 mr-1.5 opacity-70" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg> ${room}`;
                    missingList.appendChild(chip);
                });
            } else {
                missingList.classList.add('hidden');
                allUpdatedMsg.classList.remove('hidden');
                allUpdatedMsg.classList.add('flex');
            }

            const tbody = document.getElementById('overviewTableBody');
            if (tbody) {
                tbody.innerHTML = '';
                if (roomStats && roomStats.length > 0) {
                    roomStats.forEach(room => {
                        const tr = document.createElement('tr');
                        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors";
                        
                        const val = (num, colorClass) => num > 0 ? `<span class="font-bold ${colorClass}">${num}</span>` : `<span class="text-slate-300 dark:text-slate-600">0</span>`;

                        tr.innerHTML = `
                            <td class="px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-200">${room.room}</td>
                            <td class="px-4 py-3 text-sm text-center font-semibold">${room.total}</td>
                            <td class="px-4 py-3 text-sm text-center font-semibold text-emerald-600 dark:text-emerald-400">${room.updated}</td>
                            <td class="px-4 py-3 text-sm text-center">${val(room.promoted, 'text-blue-600 dark:text-blue-400')}</td>
                            <td class="px-4 py-3 text-sm text-center">${val(room.gradSame, 'text-purple-600 dark:text-purple-400')}</td>
                            <td class="px-4 py-3 text-sm text-center">${val(room.gradDiff, 'text-fuchsia-600 dark:text-fuchsia-400')}</td>
                            <td class="px-4 py-3 text-sm text-center">${val(room.retained, 'text-amber-600 dark:text-amber-400')}</td>
                            <td class="px-4 py-3 text-sm text-center">${val(room.left, 'text-rose-600 dark:text-rose-400')}</td>
                            <td class="px-4 py-3 text-sm text-center">${val(room.pendingRemove, 'text-zinc-600 dark:text-zinc-400')}</td>
                        `;
                        tbody.appendChild(tr);
                    });
                } else {
                    tbody.innerHTML = `<tr><td colspan="9" class="px-4 py-8 text-center text-slate-500">กรุณาอัปเดตโค้ด Apps Script เพื่อรองรับการแสดงผลตาราง</td></tr>`;
                }
            }

            const chartLabels = ['เลื่อนชั้น', 'สำเร็จการศึกษา (ที่เดิม)', 'สำเร็จการศึกษา (ย้าย)', 'ซ้ำชั้น', 'ย้าย/ลาออก', 'รอจำหน่าย'];
            const chartData = [stats.promoted, stats.gradSame, stats.gradDiff, stats.retained, stats.left, stats.pendingRemove];
            const chartColors = ['#3b82f6', '#a855f7', '#d946ef', '#f59e0b', '#f43f5e', '#71717a'];

            const ctx = document.getElementById('overviewChart').getContext('2d');
            const isDark = html.classList.contains('dark');
            
            if (overviewChartInstance) {
                overviewChartInstance.destroy();
            }

            const hasData = chartData.some(val => val > 0);

            overviewChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        data: hasData ? chartData : [1],
                        backgroundColor: hasData ? chartColors : ['#e2e8f0'],
                        borderWidth: 0, 
                        hoverOffset: hasData ? 6 : 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            display: hasData,
                            labels: {
                                color: isDark ? '#e2e8f0' : '#475569',
                                padding: 15,
                                font: { family: "'Prompt', sans-serif", size: 12, weight: '600' },
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        tooltip: {
                            enabled: hasData
                        }
                    },
                    cutout: '75%'
                },
                plugins: [{
                    id: 'textCenter',
                    beforeDraw: function(chart) {
                        if (!hasData) {
                            var width = chart.width, height = chart.height, ctx = chart.ctx;
                            ctx.restore();
                            var fontSize = (height / 114).toFixed(2);
                            ctx.font = "bold " + fontSize + "em 'Prompt', sans-serif";
                            ctx.textBaseline = "middle";
                            ctx.fillStyle = isDark ? "#94a3b8" : "#94a3b8";
                            var text = "ไม่มีข้อมูล",
                                textX = Math.round((width - ctx.measureText(text).width) / 2),
                                textY = height / 2;
                            ctx.fillText(text, textX, textY);
                            ctx.save();
                        }
                    }
                }]
            });
        }


        // ==========================================
        // ADMIN LOGIC (ตั้งค่า & จัดชั้นเรียน)
        // ==========================================
        async function loadSettingsData() {
            showLoading('กำลังโหลดข้อมูลตั้งค่า...');
            try {
                const res = await fetchAPI({ action: 'getSettings' });
                if (res.status === 'success') {
                    ui.settingsUsersList.innerHTML = '';
                    if(res.users && res.users.length > 0) {
                        res.users.forEach(u => {
                            const li = document.createElement('li');
                            li.className = "flex justify-between items-center p-3 bg-white dark:bg-darkcard border border-slate-200 dark:border-slate-700 rounded-lg";
                            const roleBadge = u.role === 'admin' ? `<span class="px-2 py-0.5 bg-rose-100 text-rose-600 rounded text-xs font-bold ml-2">Admin</span>` : '';
                            li.innerHTML = `
                                <div>
                                    <p class="font-bold text-sm text-slate-800 dark:text-white">${u.name} ${roleBadge}</p>
                                    <p class="text-xs text-slate-500">ห้อง: ${u.room || 'ไม่ได้ระบุ'} | Username: ${u.username}</p>
                                </div>
                                <button class="text-slate-400 hover:text-indigo-500"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                            `;
                            ui.settingsUsersList.appendChild(li);
                        });
                    }
                    
                    ui.settingsRoomsList.innerHTML = '';
                    if(res.rooms && res.rooms.length > 0) {
                        res.rooms.forEach(r => {
                            const li = document.createElement('li');
                            li.className = "flex justify-between items-center p-3 bg-white dark:bg-darkcard border border-slate-200 dark:border-slate-700 rounded-lg";
                            li.innerHTML = `
                                <span class="font-bold text-sm text-slate-800 dark:text-white">ห้องเรียน ${r}</span>
                                <div class="flex space-x-2">
                                    <button class="text-slate-400 hover:text-indigo-500"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                                    <button class="text-slate-400 hover:text-rose-500"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                                </div>
                            `;
                            ui.settingsRoomsList.appendChild(li);
                        });
                    }
                } else {
                    Swal.fire({ title: 'ข้อผิดพลาด', text: res.message || 'ไม่สามารถโหลดข้อมูลตั้งค่าได้', icon: 'error', confirmButtonColor: '#3b82f6' });
                    switchMenu('data');
                }
            } catch(err) {
                 Swal.fire('ข้อผิดพลาด', 'การเชื่อมต่อล้มเหลว', 'error');
                 switchMenu('data');
            } finally {
                hideLoading();
            }
        }

        async function loadArrangeData() {
            showLoading('กำลังโหลดรายชื่อนักเรียน...');
            try {
                const res = await fetchAPI({ action: 'getArrangeData' });
                if (res.status === 'success') {
                    arrangeData = res.students || [];
                    
                    const datalist = document.getElementById('roomSuggestions');
                    if (datalist) {
                        datalist.innerHTML = '';
                        allRoomsList.forEach(r => {
                            datalist.innerHTML += `<option value="${r}"></option>`;
                        });
                    }
                    
                    const oldRooms = [...new Set(arrangeData.map(s => s.oldRoom))];
                    ui.arrangeFilterRoom.innerHTML = '<option value="">แสดงทุกห้อง</option>';
                    oldRooms.forEach(r => {
                        ui.arrangeFilterRoom.innerHTML += `<option value="${r}">${r}</option>`;
                    });

                    renderArrangeTable();
                } else {
                    Swal.fire({ title: 'ข้อผิดพลาด', text: res.message || 'ไม่สามารถโหลดข้อมูลจัดชั้นเรียนได้', icon: 'error', confirmButtonColor: '#3b82f6' });
                    switchMenu('data');
                }
            } catch(err) {
                 Swal.fire('ข้อผิดพลาด', 'การเชื่อมต่อล้มเหลว', 'error');
                 switchMenu('data');
            } finally {
                hideLoading();
            }
        }

        function renderArrangeTable() {
            const filterVal = ui.arrangeFilterRoom.value;
            ui.arrangeTableBody.innerHTML = '';
            
            const filtered = arrangeData.filter(s => filterVal === "" || s.oldRoom === filterVal);
            
            if(filtered.length === 0) {
                ui.arrangeTableBody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-slate-500 font-medium bg-white dark:bg-darkcard rounded-xl border border-slate-200 dark:border-slate-800 md:border-none">ไม่พบรายชื่อนักเรียนที่รอจัดห้อง</td></tr>`;
                return;
            }

            filtered.forEach(student => {
                const tr = document.createElement('tr');
                
                // แปลงเป็น Card บนมือถือ
                tr.className = "block md:table-row bg-white dark:bg-darkcard border border-slate-200 dark:border-slate-700 md:border-none rounded-xl md:rounded-none shadow-sm md:shadow-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors";
                
                let statusColor = 'text-slate-600 dark:text-slate-400';
                if (student.status === 'เลื่อนชั้น') statusColor = 'text-blue-600 dark:text-blue-400';
                else if (student.status === 'ซ้ำชั้น') statusColor = 'text-amber-600 dark:text-amber-400';
                else if (student.status === 'รอจำหน่าย') statusColor = 'text-zinc-600 dark:text-zinc-400';

                tr.innerHTML = `
                    <td class="flex md:table-cell justify-between items-center px-4 py-3 border-b md:border-none border-slate-100 dark:border-slate-800 md:text-center bg-slate-50/50 dark:bg-slate-800/30 md:bg-transparent rounded-t-xl md:rounded-none">
                        <span class="md:hidden font-bold text-xs text-slate-500">เลือก</span>
                        <input type="checkbox" value="${student.id}" class="arrange-checkbox w-5 h-5 md:w-4 md:h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                    </td>
                    <td class="flex md:table-cell justify-between items-center px-4 py-3 border-b md:border-none border-slate-100 dark:border-slate-800">
                        <span class="md:hidden font-bold text-xs text-slate-500">รหัส</span>
                        <span class="text-sm font-mono text-slate-500 dark:text-slate-400">${student.id}</span>
                    </td>
                    <td class="flex md:table-cell justify-between items-center px-4 py-3 border-b md:border-none border-slate-100 dark:border-slate-800">
                        <span class="md:hidden font-bold text-xs text-slate-500">ชื่อ-นามสกุล</span>
                        <span class="text-sm font-bold text-slate-800 dark:text-slate-200">${student.name}</span>
                    </td>
                    <td class="flex md:table-cell justify-between items-center px-4 py-3 border-b md:border-none border-slate-100 dark:border-slate-800">
                        <span class="md:hidden font-bold text-xs text-slate-500">ห้องเดิม</span>
                        <span class="text-sm text-slate-600 dark:text-slate-300">${student.oldRoom}</span>
                    </td>
                    <td class="flex md:table-cell justify-between items-center px-4 py-3">
                        <span class="md:hidden font-bold text-xs text-slate-500">สถานะ</span>
                        <span class="text-sm font-bold ${statusColor}">${student.status}</span>
                    </td>
                `;
                ui.arrangeTableBody.appendChild(tr);
            });
            
            const checkboxes = document.querySelectorAll('.arrange-checkbox');
            checkboxes.forEach(cb => cb.addEventListener('change', checkSelectAllState));
            checkSelectAllState();
        }

        function toggleSelectAllArrange() {
            const isChecked = ui.arrangeSelectAll.checked;
            document.querySelectorAll('.arrange-checkbox').forEach(cb => {
                cb.checked = isChecked;
            });
        }
        
        function checkSelectAllState() {
            const allCbs = document.querySelectorAll('.arrange-checkbox');
            if(allCbs.length === 0) {
                ui.arrangeSelectAll.checked = false;
                return;
            }
            const allChecked = Array.from(allCbs).every(cb => cb.checked);
            const someChecked = Array.from(allCbs).some(cb => cb.checked);
            ui.arrangeSelectAll.checked = allChecked;
            ui.arrangeSelectAll.indeterminate = someChecked && !allChecked;
        }

        async function saveArrangement() {
            const targetRoom = ui.arrangeTargetRoom.value.trim();
            if(!targetRoom) {
                Swal.fire('แจ้งเตือน', 'กรุณาระบุชั้น/ห้องใหม่', 'warning');
                return;
            }

            const selectedStudents = Array.from(document.querySelectorAll('.arrange-checkbox:checked')).map(cb => {
                const tr = cb.closest('tr');
                return {
                    id: cb.value,
                    name: tr.cells[2].lastElementChild.innerText,
                    oldRoom: tr.cells[3].lastElementChild.innerText,
                    status: tr.cells[4].lastElementChild.innerText
                };
            });

            if(selectedStudents.length === 0) {
                Swal.fire('แจ้งเตือน', 'กรุณาเลือกรายชื่อนักเรียนอย่างน้อย 1 คน', 'warning');
                return;
            }

            Swal.fire({
                title: 'ยืนยันการจัดห้อง',
                html: `ต้องการคัดลอกนักเรียน <b>${selectedStudents.length} คน</b> ไปจัดเป็นห้อง <b>${targetRoom}</b> ใช่หรือไม่?<br><span class="text-sm text-slate-500 mt-2 block">(ข้อมูลเก่าของนักเรียนเหล่านี้จะไม่ถูกลบ)</span>`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#4f46e5',
                cancelButtonColor: '#94a3b8',
                confirmButtonText: 'ยืนยันจัดเข้าห้อง'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    showLoading('กำลังย้ายข้อมูล...');
                    try {
                        const payload = {
                            action: 'saveArrangement',
                            targetRoom: targetRoom,
                            students: selectedStudents 
                        };
                        const res = await fetchAPI(payload);
                        if(res.status === 'success') {
                            Swal.fire('สำเร็จ!', res.message, 'success');
                            loadArrangeData(); 
                            ui.arrangeTargetRoom.value = ''; 
                        } else {
                            Swal.fire('ผิดพลาด', res.message, 'error');
                        }
                    } catch(err) {
                        Swal.fire('ผิดพลาด', 'การเชื่อมต่อล้มเหลว', 'error');
                    } finally {
                        hideLoading();
                    }
                }
            });
        }

        // ==========================================
        // GUIDE MODAL LOGIC
        // ==========================================
        function openGuideModal() {
            guideModal.container.classList.remove('hidden');
            void guideModal.container.offsetWidth;
            guideModal.container.classList.remove('opacity-0');
            guideModal.content.classList.add('modal-enter');
        }

        function closeGuideModal() {
            guideModal.container.classList.add('opacity-0');
            guideModal.content.classList.remove('modal-enter');
            setTimeout(() => {
                guideModal.container.classList.add('hidden');
            }, 300);
        }

        // ==========================================
        // SUMMARY LOGIC
        // ==========================================
        function renderSummary() {
            const roomInfo = getRoomLevelInfo(currentRoom);
            const isGrad = roomInfo.isGrad;
            const isM3 = roomInfo.prefix.includes("ม") && roomInfo.num === 3;

            const stats = {
                promoted: studentsData.filter(s => s.status === 'เลื่อนชั้น').length,
                gradSame: studentsData.filter(s => s.status === 'สำเร็จการศึกษา' && String(s.subStatus).includes('เดิม')).length,
                gradDiff: studentsData.filter(s => s.status === 'สำเร็จการศึกษา' && (!String(s.subStatus).includes('เดิม'))).length,
                retained: studentsData.filter(s => s.status === 'ซ้ำชั้น').length,
                left: studentsData.filter(s => s.status === 'ย้าย/ลาออก').length,
                pendingRemove: studentsData.filter(s => s.status === 'รอจำหน่าย').length
            };

            document.getElementById('statPromoted').textContent = stats.promoted;
            document.getElementById('statRetained').textContent = stats.retained;
            document.getElementById('statLeft').textContent = stats.left;
            document.getElementById('statPendingRemove').textContent = stats.pendingRemove;

            let chartLabels = [];
            let chartData = [];
            let chartColors = [];

            document.getElementById('boxPromoted').classList.toggle('hidden', isGrad);

            if (isM3) {
                stats.gradDiff = studentsData.filter(s => s.status === 'สำเร็จการศึกษา').length;
                document.getElementById('statGradDiff').textContent = stats.gradDiff;

                document.getElementById('boxGradSame').classList.add('hidden');
                document.getElementById('boxGradDiff').classList.remove('hidden');
                document.getElementById('labelGradDiff').textContent = 'สำเร็จการศึกษา (จบหลักสูตร ม.3)';

                chartLabels = ['จบหลักสูตร ม.3', 'ซ้ำชั้น', 'ย้าย/ลาออก', 'รอจำหน่าย'];
                chartData = [stats.gradDiff, stats.retained, stats.left, stats.pendingRemove];
                chartColors = ['#d946ef', '#f59e0b', '#f43f5e', '#71717a'];
            } 
            else if (isGrad) {
                document.getElementById('statGradSame').textContent = stats.gradSame;
                document.getElementById('statGradDiff').textContent = stats.gradDiff;

                document.getElementById('boxGradSame').classList.remove('hidden');
                document.getElementById('boxGradDiff').classList.remove('hidden');
                document.getElementById('labelGradSame').textContent = 'สำเร็จการศึกษา (ต่อที่เดิม)';
                document.getElementById('labelGradDiff').textContent = 'สำเร็จการศึกษา (ย้ายโรงเรียน)';

                chartLabels = ['จบฯ (ต่อที่เดิม)', 'จบฯ (ย้ายที่ใหม่)', 'ซ้ำชั้น', 'ย้าย/ลาออก', 'รอจำหน่าย'];
                chartData = [stats.gradSame, stats.gradDiff, stats.retained, stats.left, stats.pendingRemove];
                chartColors = ['#a855f7', '#d946ef', '#f59e0b', '#f43f5e', '#71717a'];
            } 
            else {
                document.getElementById('boxGradSame').classList.add('hidden');
                document.getElementById('boxGradDiff').classList.add('hidden');

                chartLabels = ['เลื่อนชั้น', 'ซ้ำชั้น', 'ย้าย/ลาออก', 'รอจำหน่าย'];
                chartData = [stats.promoted, stats.retained, stats.left, stats.pendingRemove];
                chartColors = ['#3b82f6', '#f59e0b', '#f43f5e', '#71717a'];
            }

            const ctx = document.getElementById('statsChart').getContext('2d');
            const isDark = html.classList.contains('dark');
            
            if (chartInstance) {
                chartInstance.destroy();
            }

            chartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        data: chartData,
                        backgroundColor: chartColors,
                        borderWidth: 0, 
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: isDark ? '#e2e8f0' : '#475569',
                                padding: 20,
                                font: {
                                    family: "'Prompt', sans-serif",
                                    size: window.innerWidth < 640 ? 12 : 14,
                                    weight: '600'
                                },
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        }
                    },
                    cutout: '75%'
                }
            });
        }

        // ==========================================
        // UTILITIES & NAVIGATION
        // ==========================================
        function switchMenu(menuName) {
            // Update Active Menu Styling
            document.querySelectorAll('.nav-menu').forEach(el => {
                el.classList.remove('bg-blue-50', 'text-blue-700', 'dark:bg-blue-900/30', 'dark:text-blue-400', 'active');
                el.classList.add('text-slate-600', 'dark:text-slate-400');
            });
            
            const activeMenu = document.getElementById(`menu-${menuName}`);
            if (activeMenu) {
                activeMenu.classList.remove('text-slate-600', 'dark:text-slate-400');
                activeMenu.classList.add('bg-blue-50', 'text-blue-700', 'dark:bg-blue-900/30', 'dark:text-blue-400', 'active');
            }

            // Close mobile sidebar if open
            ui.sidebar.classList.remove('mobile-open');
            ui.sidebarOverlay.classList.add('hidden');

            // API calls depending on menu
            if (menuName === 'overview') {
                loadOverviewData();
            } else if (menuName === 'settings') {
                loadSettingsData();
            } else if (menuName === 'arrange') {
                loadArrangeData();
            }

            showSection(menuName);
        }

        function showSection(sectionName) {
            Object.values(sections).forEach(sec => sec.classList.add('hidden'));
            if(sections[sectionName]) {
                if (['data', 'overview', 'summary', 'settings', 'arrange', 'note'].includes(sectionName)) {
                    sections[sectionName].classList.add('flex');
                    sections[sectionName].classList.remove('hidden');
                } else {
                    sections[sectionName].classList.remove('hidden');
                }
            }
        }

        function showLoading(text = 'กำลังประมวลผล...') {
            ui.loadingText.textContent = text;
            ui.loadingOverlay.classList.remove('hidden');
            ui.loadingOverlay.classList.add('flex');
            setTimeout(() => ui.loadingOverlay.style.opacity = '1', 10);
        }

        function hideLoading() {
            ui.loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                ui.loadingOverlay.classList.add('hidden');
                ui.loadingOverlay.classList.remove('flex');
            }, 300);
        }

        function logout() {
            Swal.fire({
                title: 'ยืนยันการออกจากระบบ',
                text: "คุณต้องการออกจากระบบใช่หรือไม่?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#94a3b8',
                confirmButtonText: 'ออกจากระบบ',
                cancelButtonText: 'ยกเลิก'
            }).then((result) => {
                if (result.isConfirmed) {
                    currentUser = null;
                    currentRole = null;
                    currentRoom = null;
                    studentsData = [];
                    arrangeData = [];
                    allRoomsList = [];
                    
                    document.getElementById('loginForm').reset();
                    ui.sidebar.classList.add('hidden');
                    ui.btnHamburger.classList.add('hidden');
                    ui.roomSelector.classList.add('hidden');
                    ui.searchInput.value = '';
                    
                    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
                    
                    showSection('login');
                }
            });
        }
