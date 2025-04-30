// 文件传输进度处理

// 全局变量
window.isTransferActive = false;
window.transferMode = null; // 'local' 或 'internet'

document.addEventListener('DOMContentLoaded', () => {
    // 选择DOM元素
    const transferProgressPanel = document.getElementById('transferProgressPanel');
    const closeTransferPanel = document.getElementById('closeTransferPanel');
    const cancelTransferBtn = document.getElementById('cancelTransferBtn');
    const appContent = document.querySelector('.app-content');
    const panelBackdrop = document.getElementById('panelBackdrop');
    
    // 关闭传输进度面板
    closeTransferPanel.addEventListener('click', () => {
        if (!window.isTransferActive || confirm('确定要关闭传输进度面板吗？传输将在后台继续进行。')) {
            transferProgressPanel.style.transform = 'translateY(100%)';
            
            // 延迟移除主页面的缩放效果，与面板动画同步
            setTimeout(() => {
                appContent.classList.remove('panel-open');
                panelBackdrop.classList.remove('show');
                transferProgressPanel.style.display = 'none';
            }, 300);
        }
    });
    
    // 取消传输
    cancelTransferBtn.addEventListener('click', () => {
        if (window.isTransferActive && confirm('确定要取消文件传输吗？已传输的部分将被保留。')) {
            stopFileTransfer();
        }
    });
});

// 开始文件传输
window.startFileTransfer = function(mode, fileType = '') {
    window.transferMode = mode;
    const transferProgressPanel = document.getElementById('transferProgressPanel');
    const panelBackdrop = document.getElementById('panelBackdrop');
    
    // 准备传输面板
    document.getElementById('transferMode').textContent = mode === 'local' ? '局域网传输' : '公网传输';
    
    if (mode === 'local' && window.selectedDevice) {
        document.getElementById('targetDeviceName').textContent = window.selectedDevice.dataset.deviceName;
        document.getElementById('targetConnectionInfo').textContent = '局域网连接';
        
        // 设置设备图标
        const deviceIcon = window.selectedDevice.querySelector('.device-icon i').className;
        document.getElementById('targetDeviceIcon').className = deviceIcon;
    } else {
        document.getElementById('targetDeviceName').textContent = '远程设备';
        document.getElementById('targetConnectionInfo').textContent = '公网连接 (密码: ' + document.getElementById('transferCode').textContent + ')';
        document.getElementById('targetDeviceIcon').className = 'fas fa-globe';
    }
    
    // 清空文件列表并添加文件
    const filesList = document.getElementById('transferFilesList');
    filesList.innerHTML = '';
    
    // 根据模式选择不同的文件添加方式
    if (mode === 'internet' && window.selectedInternetFiles.length > 0) {
        // 使用用户在公网传输中选择的文件
        let totalSize = 0;
        window.selectedInternetFiles.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-transfer-item';
            fileItem.style.cssText = 'display: flex; align-items: center; padding: 10px; margin-bottom: 8px; border-radius: 8px; background-color: var(--background-color);';
            
            fileItem.innerHTML = `
                <div style="margin-right: 10px; width: 30px; height: 30px; background-color: rgba(82, 113, 255, 0.1); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas ${file.icon}" style="color: var(--primary-color);"></i>
                </div>
                <div style="flex: 1; overflow: hidden;">
                    <div style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary);">${file.name}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${file.size}</div>
                </div>
                <div style="width: 60px; text-align: right; font-size: 12px; color: var(--primary-color);">等待中</div>
            `;
            
            filesList.appendChild(fileItem);
        });
        
        // 清空已选择的文件列表，避免重复使用
        clearSelectedFiles();
    } else if (mode === 'local' && window.selectedLocalFilesArray.length > 0) {
        // 使用局域网选择的文件
        window.selectedLocalFilesArray.forEach(file => {
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
            
            const fileItem = document.createElement('div');
            fileItem.className = 'file-transfer-item';
            fileItem.style.cssText = 'display: flex; align-items: center; padding: 10px; margin-bottom: 8px; border-radius: 8px; background-color: var(--background-color);';
            
            fileItem.innerHTML = `
                <div style="margin-right: 10px; width: 30px; height: 30px; background-color: rgba(82, 113, 255, 0.1); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas ${iconClass}" style="color: var(--primary-color);"></i>
                </div>
                <div style="flex: 1; overflow: hidden;">
                    <div style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary);">${file.name}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${fileSize}</div>
                </div>
                <div style="width: 60px; text-align: right; font-size: 12px; color: var(--primary-color);">等待中</div>
            `;
            
            filesList.appendChild(fileItem);
        });
    } else {
        // 使用模拟文件（局域网传输或未选择公网文件）
        // 根据文件类型添加示例文件
        const fileTypes = {
            '照片': { icon: 'fa-image', exts: ['jpg', 'png', 'heic'] },
            '视频': { icon: 'fa-video', exts: ['mp4', 'mov'] },
            '音乐': { icon: 'fa-music', exts: ['mp3', 'flac'] },
            '文档': { icon: 'fa-file-alt', exts: ['docx', 'pdf', 'txt'] },
            '压缩包': { icon: 'fa-file-archive', exts: ['zip', 'rar'] }
        };
        
        // 默认类型
        let iconClass = 'fa-file';
        let extensions = ['pdf', 'docx', 'jpg'];
        
        if (fileType && fileTypes[fileType]) {
            iconClass = fileTypes[fileType].icon;
            extensions = fileTypes[fileType].exts;
        }
        
        // 生成1-3个随机文件
        const fileCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < fileCount; i++) {
            const ext = extensions[Math.floor(Math.random() * extensions.length)];
            const size = (Math.random() * 10 + 0.5).toFixed(1);
            
            const fileItem = document.createElement('div');
            fileItem.className = 'file-transfer-item';
            fileItem.style.cssText = 'display: flex; align-items: center; padding: 10px; margin-bottom: 8px; border-radius: 8px; background-color: var(--background-color);';
            
            fileItem.innerHTML = `
                <div style="margin-right: 10px; width: 30px; height: 30px; background-color: rgba(82, 113, 255, 0.1); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas ${iconClass}" style="color: var(--primary-color);"></i>
                </div>
                <div style="flex: 1; overflow: hidden;">
                    <div style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary);">文件${i+1}.${ext}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${size} MB</div>
                </div>
                <div style="width: 60px; text-align: right; font-size: 12px; color: var(--primary-color);">等待中</div>
            `;
            
            filesList.appendChild(fileItem);
        }
    }
    
    // 显示传输面板，保持遮罩层
    transferProgressPanel.style.display = 'block';
    panelBackdrop.classList.add('show');
    
    // 使用更平滑的动画效果
    setTimeout(() => {
        transferProgressPanel.style.transform = 'translateY(0)';
    }, 10);
    
    // 获取所有文件项目以计算总大小
    const fileItems = document.querySelectorAll('.file-transfer-item');
    let totalSize = 0;
    fileItems.forEach(item => {
        const sizeText = item.querySelector('div:nth-child(2) div:nth-child(2)').textContent;
        let size;
        
        if (sizeText.includes(' MB')) {
            size = parseFloat(sizeText.replace(' MB', ''));
        } else if (sizeText.includes(' KB')) {
            size = parseFloat(sizeText.replace(' KB', '')) / 1024;
        } else {
            size = parseFloat(sizeText.replace(' B', '')) / (1024 * 1024);
        }
        
        totalSize += size;
    });
    
    // 开始模拟传输进度
    setTimeout(() => {
        simulateFileTransfer(totalSize);
    }, 500);
};

// 模拟文件传输进度
function simulateFileTransfer(totalSizeMB) {
    window.isTransferActive = true;
    document.getElementById('transferStatus').textContent = '传输中';
    document.getElementById('transferStatus').style.backgroundColor = 'rgba(82, 113, 255, 0.1)';
    document.getElementById('transferStatus').style.color = 'var(--primary-color)';
    
    const fileItems = document.querySelectorAll('.file-transfer-item');
    const totalProgress = document.getElementById('totalProgressBar');
    const totalProgressPercent = document.getElementById('totalProgressPercent');
    const transferSpeed = document.getElementById('transferSpeed');
    const transferTimeRemaining = document.getElementById('transferTimeRemaining');
    
    let currentProgress = 0;
    const totalBytes = totalSizeMB * 1024 * 1024;
    let startTime = Date.now();
    
    // 初始化每个文件的状态
    fileItems.forEach((item, index) => {
        setTimeout(() => {
            item.querySelector('div:last-child').textContent = '传输中';
            
            // 添加过渡动画
            item.style.transition = 'transform 0.2s ease, background-color 0.3s ease';
            item.style.transform = 'translateX(5px)';
            setTimeout(() => {
                item.style.transform = 'translateX(0)';
            }, 200);
        }, index * 800);
    });
    
    // 模拟进度更新
    const progressInterval = setInterval(() => {
        // 计算新进度
        const increment = Math.random() * 5;
        currentProgress += increment;
        
        if (currentProgress >= 100) {
            currentProgress = 100;
            clearInterval(progressInterval);
            
            // 传输完成
            document.getElementById('transferStatus').textContent = '已完成';
            document.getElementById('transferStatus').style.backgroundColor = 'rgba(54, 179, 126, 0.1)';
            document.getElementById('transferStatus').style.color = 'var(--success-color)';
            transferTimeRemaining.textContent = '传输完成';
            
            fileItems.forEach(item => {
                item.querySelector('div:last-child').textContent = '已完成';
                item.querySelector('div:last-child').style.color = 'var(--success-color)';
                
                // 添加完成动画
                item.style.transition = 'transform 0.3s ease, background-color 0.3s ease';
                item.style.backgroundColor = 'rgba(54, 179, 126, 0.05)';
                item.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    item.style.transform = 'scale(1)';
                }, 300);
            });
            
            window.isTransferActive = false;
        }
        
        // 更新UI
        totalProgress.style.width = `${currentProgress}%`;
        totalProgressPercent.textContent = `${Math.round(currentProgress)}%`;
        
        // 计算传输速度
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const bytesTransferred = (totalBytes * currentProgress) / 100;
        const bytesPerSecond = bytesTransferred / elapsedSeconds;
        
        // 显示合适的单位 (KB/s 或 MB/s)
        let speedText = '';
        if (bytesPerSecond >= 1024 * 1024) {
            speedText = `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
        } else {
            speedText = `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
        }
        
        transferSpeed.textContent = speedText;
        
        // 计算剩余时间
        if (currentProgress < 100) {
            const remainingBytes = totalBytes - bytesTransferred;
            const remainingSeconds = remainingBytes / bytesPerSecond;
            
            if (remainingSeconds < 60) {
                transferTimeRemaining.textContent = `剩余时间: ${Math.round(remainingSeconds)} 秒`;
            } else if (remainingSeconds < 3600) {
                transferTimeRemaining.textContent = `剩余时间: ${Math.floor(remainingSeconds / 60)} 分 ${Math.round(remainingSeconds % 60)} 秒`;
            } else {
                transferTimeRemaining.textContent = `剩余时间: ${Math.floor(remainingSeconds / 3600)} 时 ${Math.floor((remainingSeconds % 3600) / 60)} 分`;
            }
        }
        
        // 随机更新一个文件的状态为已完成
        if (currentProgress > 30 && Math.random() > 0.85) {
            const notCompletedItems = [...fileItems].filter(item => 
                item.querySelector('div:last-child').textContent === '传输中'
            );
            
            if (notCompletedItems.length > 0) {
                const randomItem = notCompletedItems[Math.floor(Math.random() * notCompletedItems.length)];
                randomItem.querySelector('div:last-child').textContent = '已完成';
                randomItem.querySelector('div:last-child').style.color = 'var(--success-color)';
                
                // 添加完成动画
                randomItem.style.transition = 'transform 0.3s ease, background-color 0.3s ease';
                randomItem.style.backgroundColor = 'rgba(54, 179, 126, 0.05)';
                randomItem.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    randomItem.style.transform = 'scale(1)';
                }, 300);
            }
        }
        
    }, 300);
}

// 停止文件传输
function stopFileTransfer() {
    document.getElementById('transferStatus').textContent = '已取消';
    document.getElementById('transferStatus').style.backgroundColor = 'rgba(255, 86, 48, 0.1)';
    document.getElementById('transferStatus').style.color = 'var(--error-color)';
    document.getElementById('transferTimeRemaining').textContent = '传输已取消';
    
    const fileItems = document.querySelectorAll('.file-transfer-item');
    fileItems.forEach(item => {
        if (item.querySelector('div:last-child').textContent === '传输中') {
            item.querySelector('div:last-child').textContent = '已取消';
            item.querySelector('div:last-child').style.color = 'var(--error-color)';
            
            // 添加取消动画
            item.style.transition = 'transform 0.2s ease, background-color 0.3s ease';
            item.style.backgroundColor = 'rgba(255, 86, 48, 0.05)';
            item.style.transform = 'translateX(5px)';
            setTimeout(() => {
                item.style.transform = 'translateX(0)';
            }, 200);
        }
    });
    
    window.isTransferActive = false;
} 