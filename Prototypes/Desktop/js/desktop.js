// 桌面端JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const radarDevices = document.querySelectorAll('.radar-device');
    const sendFileBtn = document.getElementById('sendFileBtn');
    const selectedDeviceInfo = document.getElementById('selectedDeviceInfo');
    const noDeviceSelectedInfo = document.getElementById('noDeviceSelectedInfo');
    const selectedDeviceName = document.getElementById('selectedDeviceName');
    
    const modalBackdrop = document.getElementById('modalBackdrop');
    
    const receiveFileBtn = document.getElementById('receiveFileBtn');
    const receiveDrawer = document.getElementById('receiveDrawer');
    const closeReceiveDrawer = document.getElementById('closeReceiveDrawer');
    
    const sendFileDrawer = document.getElementById('sendFileDrawer');
    const closeFileDrawer = document.getElementById('closeFileDrawer');
    
    const transferProgressDrawer = document.getElementById('transferProgressDrawer');
    const closeTransferDrawer = document.getElementById('closeTransferDrawer');
    
    const localDeviceInfo = document.getElementById('localDeviceInfo');
    const internetDeviceInfo = document.getElementById('internetDeviceInfo');
    
    const fileInput = document.getElementById('file-input');
    const folderInput = document.getElementById('folder-input');
    const selectedFiles = document.getElementById('selectedFiles');
    const filesList = document.getElementById('filesList');
    const startTransferBtn = document.getElementById('startTransferBtn');
    const cancelTransferBtn = document.getElementById('cancelTransferBtn');
    
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const connectionCode = document.getElementById('connectionCode');
    
    // 全局变量
    let selectedDevice = null;
    let selectedFilesArray = [];
    
    // 雷达上设备图标点击事件
    radarDevices.forEach(device => {
        device.addEventListener('click', function() {
            // 移除其他设备的选中状态
            radarDevices.forEach(d => d.classList.remove('selected'));
            
            // 选中当前设备
            this.classList.add('selected');
            
            // 更新选中设备信息
            const deviceName = this.getAttribute('data-device-name');
            
            selectedDevice = {
                id: this.getAttribute('data-device-id'),
                name: deviceName,
                type: 'local'
            };
            
            // 更新UI
            selectedDeviceInfo.style.display = 'block';
            noDeviceSelectedInfo.style.display = 'none';
            selectedDeviceName.textContent = selectedDevice.name;
            
            console.log(`已选择设备: ${selectedDevice.name} (${selectedDevice.type})`);
        });
    });
    
    // 点击发送文件按钮
    if (sendFileBtn) {
        sendFileBtn.addEventListener('click', function() {
            // 显示抽屉和遮罩层
            openDrawer(sendFileDrawer);
            
            // 如果未选择设备，默认使用公网连接
            if (!selectedDevice) {
                selectedDevice = {
                    id: 'internet',
                    name: '公网连接',
                    type: 'internet'
                };
            }
            
            // 根据选择的设备类型显示不同的信息
            if (selectedDevice.type === 'local') {
                localDeviceInfo.style.display = 'block';
                internetDeviceInfo.style.display = 'none';
                
                // 设置目标设备信息
                document.getElementById('targetDeviceName').textContent = selectedDevice.name;
                
                // 根据设备ID设置不同的图标
                let iconClass = 'fa-mobile-alt';
                if (selectedDevice.name.includes('iPad')) {
                    iconClass = 'fa-tablet-alt';
                } else if (selectedDevice.name.includes('Mac')) {
                    iconClass = 'fa-laptop';
                }
                document.getElementById('targetDeviceIcon').className = `fas ${iconClass}`;
                document.getElementById('connectionType').textContent = '局域网连接';
            } else {
                localDeviceInfo.style.display = 'none';
                internetDeviceInfo.style.display = 'block';
                
                // 生成随机6位密码
                const randomCode = Math.floor(100000 + Math.random() * 900000);
                connectionCode.textContent = randomCode;
            }
        });
    }
    
    // 复制密码
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', function() {
            const code = connectionCode.textContent;
            navigator.clipboard.writeText(code).then(() => {
                alert('密码已复制到剪贴板');
            });
        });
    }
    
    // 文件选择
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            handleFileSelection(e.target.files);
        });
    }
    
    if (folderInput) {
        folderInput.addEventListener('change', function(e) {
            handleFileSelection(e.target.files);
        });
    }
    
    // 处理文件选择
    function handleFileSelection(files) {
        if (!files || files.length === 0) return;
        
        // 清空之前选择的文件
        selectedFilesArray = Array.from(files);
        filesList.innerHTML = '';
        
        // 添加文件到列表
        selectedFilesArray.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'transfer-item';
            
            // 确定文件图标
            let iconClass = 'fa-file';
            if (file.type.startsWith('image/')) iconClass = 'fa-file-image';
            else if (file.type.startsWith('video/')) iconClass = 'fa-file-video';
            else if (file.type.startsWith('audio/')) iconClass = 'fa-file-audio';
            else if (file.type.includes('pdf')) iconClass = 'fa-file-pdf';
            else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) iconClass = 'fa-file-word';
            else if (file.type.includes('excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) iconClass = 'fa-file-excel';
            
            // 格式化文件大小
            let fileSize = '';
            if (file.size < 1024) {
                fileSize = file.size + ' B';
            } else if (file.size < 1024 * 1024) {
                fileSize = (file.size / 1024).toFixed(1) + ' KB';
            } else {
                fileSize = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
            }
            
            fileItem.innerHTML = `
                <div class="file-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
                <button class="remove-file-btn" data-index="${selectedFilesArray.indexOf(file)}" style="background: none; border: none; color: var(--error-color); font-size: 16px;">
                    <i class="fas fa-times-circle"></i>
                </button>
            `;
            
            filesList.appendChild(fileItem);
        });
        
        // 显示文件列表
        selectedFiles.style.display = 'block';
        
        // 添加移除按钮事件
        document.querySelectorAll('.remove-file-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const index = parseInt(this.getAttribute('data-index'));
                if (index >= 0) {
                    selectedFilesArray.splice(index, 1);
                    // 重新渲染文件列表
                    handleFileSelection(selectedFilesArray);
                    
                    // 如果没有文件了，隐藏文件列表
                    if (selectedFilesArray.length === 0) {
                        selectedFiles.style.display = 'none';
                    }
                }
            });
        });
    }
    
    // 开始传输按钮点击事件
    if (startTransferBtn) {
        startTransferBtn.addEventListener('click', function() {
            if (selectedFilesArray.length === 0) {
                alert('请选择要传输的文件');
                return;
            }
            
            // 关闭文件选择抽屉
            closeDrawer(sendFileDrawer);
            
            // 打开传输进度抽屉
            setTimeout(() => {
                openDrawer(transferProgressDrawer);
                
                // 设置传输设备信息
                document.getElementById('transferDeviceName').textContent = selectedDevice.name;
                
                // 根据设备ID设置不同的图标
                let iconClass = 'fa-mobile-alt';
                if (selectedDevice.name.includes('iPad')) {
                    iconClass = 'fa-tablet-alt';
                } else if (selectedDevice.name.includes('Mac')) {
                    iconClass = 'fa-laptop';
                } else if (selectedDevice.type === 'internet') {
                    iconClass = 'fa-globe';
                }
                document.getElementById('transferDeviceIcon').className = `fas ${iconClass}`;
                
                if (selectedDevice.type === 'local') {
                    document.getElementById('transferConnectionType').textContent = '局域网连接';
                } else {
                    document.getElementById('transferConnectionType').textContent = '公网连接';
                }
                
                // 创建传输文件列表
                createTransferFilesList();
                
                // 开始模拟传输进度
                simulateFileTransfer();
            }, 300);
        });
    }
    
    // 创建传输文件列表
    function createTransferFilesList() {
        const transferFiles = document.getElementById('transferFiles');
        transferFiles.innerHTML = '';
        
        selectedFilesArray.forEach((file, index) => {
            // 确定文件图标
            let iconClass = 'fa-file';
            if (file.type.startsWith('image/')) iconClass = 'fa-file-image';
            else if (file.type.startsWith('video/')) iconClass = 'fa-file-video';
            else if (file.type.startsWith('audio/')) iconClass = 'fa-file-audio';
            else if (file.type.includes('pdf')) iconClass = 'fa-file-pdf';
            else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) iconClass = 'fa-file-word';
            else if (file.type.includes('excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) iconClass = 'fa-file-excel';
            
            // 格式化文件大小
            let fileSize = '';
            if (file.size < 1024) {
                fileSize = file.size + ' B';
            } else if (file.size < 1024 * 1024) {
                fileSize = (file.size / 1024).toFixed(1) + ' KB';
            } else {
                fileSize = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
            }
            
            const transferItem = document.createElement('div');
            transferItem.className = 'transfer-item';
            transferItem.innerHTML = `
                <div class="file-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
                <div class="file-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="file-progress-${index}" style="width: 0%"></div>
                    </div>
                </div>
                <div class="file-status" id="file-status-${index}">等待中</div>
            `;
            
            transferFiles.appendChild(transferItem);
        });
    }
    
    // 模拟文件传输进度
    function simulateFileTransfer() {
        let totalProgress = 0;
        const totalFiles = selectedFilesArray.length;
        let completedFiles = 0;
        let transferStartTime = Date.now();
        let intervalId;
        
        // 计算文件总大小(MB)
        const totalSize = selectedFilesArray.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024);
        
        // 更新总进度显示
        function updateTotalProgress() {
            const totalProgressPercent = document.getElementById('totalProgressPercent');
            const totalProgressFill = document.getElementById('totalProgressFill');
            
            totalProgressPercent.textContent = `${Math.round(totalProgress)}%`;
            totalProgressFill.style.width = `${totalProgress}%`;
            
            // 计算传输速度
            const timeElapsed = (Date.now() - transferStartTime) / 1000; // 秒
            const transferredSize = (totalSize * totalProgress / 100);
            const speedMBps = transferredSize / timeElapsed;
            
            const transferSpeed = document.getElementById('transferSpeed');
            if (speedMBps < 1) {
                transferSpeed.textContent = `${(speedMBps * 1024).toFixed(1)} KB/s`;
            } else {
                transferSpeed.textContent = `${speedMBps.toFixed(1)} MB/s`;
            }
            
            // 计算剩余时间
            const timeRemaining = document.getElementById('timeRemaining');
            const remainingSize = totalSize - transferredSize;
            
            if (remainingSize <= 0 || speedMBps <= 0) {
                timeRemaining.textContent = '已完成';
            } else {
                const remainingSeconds = Math.ceil(remainingSize / speedMBps);
                
                if (remainingSeconds < 60) {
                    timeRemaining.textContent = `${remainingSeconds}秒`;
                } else if (remainingSeconds < 3600) {
                    const minutes = Math.floor(remainingSeconds / 60);
                    const seconds = remainingSeconds % 60;
                    timeRemaining.textContent = `${minutes}分${seconds}秒`;
                } else {
                    const hours = Math.floor(remainingSeconds / 3600);
                    const minutes = Math.floor((remainingSeconds % 3600) / 60);
                    timeRemaining.textContent = `${hours}小时${minutes}分`;
                }
            }
        }
        
        // 更新单个文件进度
        function updateFileProgress() {
            // 随机选择文件增加进度
            const fileProgresses = selectedFilesArray.map((_, index) => {
                const progressElement = document.getElementById(`file-progress-${index}`);
                const statusElement = document.getElementById(`file-status-${index}`);
                
                if (!progressElement || !statusElement) return 100; // 如果元素不存在，视为已完成
                
                const currentWidth = parseFloat(progressElement.style.width) || 0;
                
                // 如果已完成，返回当前进度
                if (currentWidth >= 100) {
                    return 100;
                }
                
                // 随机增加进度
                let newProgress = currentWidth + (Math.random() * 5);
                if (newProgress > 100) newProgress = 100;
                
                // 更新UI
                progressElement.style.width = `${newProgress}%`;
                
                if (newProgress < 100) {
                    statusElement.textContent = '传输中';
                } else {
                    statusElement.textContent = '已完成';
                    completedFiles++;
                }
                
                return newProgress;
            });
            
            // 计算总体进度
            totalProgress = fileProgresses.reduce((sum, progress) => sum + progress, 0) / totalFiles;
            
            // 更新总进度显示
            updateTotalProgress();
            
            // 如果所有文件都完成，停止定时器
            if (completedFiles >= totalFiles) {
                clearInterval(intervalId);
                document.getElementById('timeRemaining').textContent = '已完成';
                setTimeout(() => {
                    alert('所有文件传输完成！');
                }, 500);
            }
        }
        
        // 设置定时器，模拟进度变化
        intervalId = setInterval(updateFileProgress, 300);
        
        // 取消传输按钮
        cancelTransferBtn.addEventListener('click', function cancelTransferHandler() {
            clearInterval(intervalId);
            closeDrawer(transferProgressDrawer);
            cancelTransferBtn.removeEventListener('click', cancelTransferHandler);
        });
    }
    
    // 接收文件按钮点击事件
    if (receiveFileBtn) {
        receiveFileBtn.addEventListener('click', function() {
            openDrawer(receiveDrawer);
        });
    }
    
    // 关闭接收文件抽屉
    if (closeReceiveDrawer) {
        closeReceiveDrawer.addEventListener('click', function() {
            closeDrawer(receiveDrawer);
        });
    }
    
    // 关闭文件选择抽屉
    if (closeFileDrawer) {
        closeFileDrawer.addEventListener('click', function() {
            closeDrawer(sendFileDrawer);
        });
    }
    
    // 关闭传输进度抽屉
    if (closeTransferDrawer) {
        closeTransferDrawer.addEventListener('click', function() {
            closeDrawer(transferProgressDrawer);
        });
    }
    
    // 点击遮罩层关闭所有抽屉
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', function() {
            closeAllDrawers();
        });
    }
    
    // 打开抽屉函数
    function openDrawer(drawer) {
        modalBackdrop.classList.add('show');
        drawer.classList.add('show');
    }
    
    // 关闭抽屉函数
    function closeDrawer(drawer) {
        drawer.classList.remove('show');
        
        // 检查是否还有其他抽屉打开
        const anyDrawerOpen = document.querySelector('.side-drawer.show');
        if (!anyDrawerOpen) {
            modalBackdrop.classList.remove('show');
        }
    }
    
    // 关闭所有抽屉
    function closeAllDrawers() {
        document.querySelectorAll('.side-drawer').forEach(drawer => {
            drawer.classList.remove('show');
        });
        modalBackdrop.classList.remove('show');
    }
    
    // 刷新设备列表按钮
    const refreshDevicesBtn = document.getElementById('refreshDevicesBtn');
    if (refreshDevicesBtn) {
        refreshDevicesBtn.addEventListener('click', function() {
            // 添加旋转动画
            this.classList.add('rotating');
            
            // 模拟刷新操作
            setTimeout(() => {
                this.classList.remove('rotating');
                alert('已刷新设备列表');
            }, 1000);
        });
    }
    
    // 设置按钮点击事件
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsDrawer = document.getElementById('settingsDrawer');
    const closeSettingsDrawer = document.getElementById('closeSettingsDrawer');
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            openDrawer(settingsDrawer);
        });
    }
    
    // 关闭设置抽屉
    if (closeSettingsDrawer) {
        closeSettingsDrawer.addEventListener('click', function() {
            closeDrawer(settingsDrawer);
        });
    }
}); 