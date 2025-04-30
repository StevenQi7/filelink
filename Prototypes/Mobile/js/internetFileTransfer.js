// 公网传输相关代码

document.addEventListener('DOMContentLoaded', () => {
    // 选择DOM元素
    const copyTransferCode = document.getElementById('copyTransferCode');
    const startInternetFileTransfer = document.getElementById('startInternetFileTransfer');
    const internetFileInput = document.getElementById('internet-file-input');
    const internetFolderInput = document.getElementById('internet-folder-input');
    const fileSelector = document.getElementById('fileSelector');
    const selectedInternetFiles = document.getElementById('selected-internet-files');
    const appContent = document.querySelector('.app-content');
    const panelBackdrop = document.getElementById('panelBackdrop');
    
    // 生成随机传输码
    function generateTransferCode() {
        const randomCode = Math.floor(100000 + Math.random() * 900000);
        document.getElementById('transferCode').textContent = randomCode;
    }
    
    // 复制传输码
    copyTransferCode.addEventListener('click', () => {
        const code = document.getElementById('transferCode').textContent;
        navigator.clipboard.writeText(code).then(() => {
            alert('传输码已复制到剪贴板');
        });
    });
    
    // 开始公网文件传输
    startInternetFileTransfer.addEventListener('click', () => {
        fileSelector.classList.remove('show');
        // 不移除主内容的缩放效果，因为传输进度面板会立即显示
        window.startFileTransfer('internet');
    });
    
    // 修改文件选择器打开时的逻辑
    const sendFileBtn = document.getElementById('sendFileBtn');
    if (sendFileBtn) {
        sendFileBtn.addEventListener('click', () => {
            // 显示文件选择器和应用缩放效果在fileSelectors.js中处理
            
            // 根据是否选择了设备显示对应内容
            if (window.selectedDevice) {
                document.getElementById('deviceSelectedInfo').style.display = 'block';
                document.getElementById('noDeviceSelectedInfo').style.display = 'none';
                document.getElementById('localTransferOptions').style.display = 'block';
                document.getElementById('selectedDeviceName').textContent = window.selectedDevice.dataset.deviceName;
            } else {
                document.getElementById('deviceSelectedInfo').style.display = 'none';
                document.getElementById('noDeviceSelectedInfo').style.display = 'block';
                document.getElementById('localTransferOptions').style.display = 'none';
                
                // 默认隐藏已选择文件区域
                selectedInternetFiles.style.display = 'none';
                
                // 当未选择设备时，生成传输码
                generateTransferCode();
            }
        });
    }
    
    // 公网传输文件选择处理
    internetFileInput.addEventListener('change', (e) => {
        handleInternetFileSelection(e.target.files);
    });
    
    internetFolderInput.addEventListener('change', (e) => {
        handleInternetFileSelection(e.target.files);
    });
});

// 处理公网传输文件选择
function handleInternetFileSelection(files) {
    if (!files || files.length === 0) return;
    
    // 获取DOM元素
    const selectedFilesList = document.getElementById('selectedFilesList');
    const selectedInternetFiles = document.getElementById('selected-internet-files');
    
    // 清空当前选择的文件列表
    window.selectedInternetFiles = [];
    selectedFilesList.innerHTML = '';
    
    // 添加文件到列表
    Array.from(files).forEach(file => {
        // 格式化文件大小
        let fileSize = '';
        if (file.size < 1024) {
            fileSize = file.size + ' B';
        } else if (file.size < 1024 * 1024) {
            fileSize = (file.size / 1024).toFixed(1) + ' KB';
        } else {
            fileSize = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
        }
        
        // 确定文件图标
        let iconClass = 'fa-file';
        if (file.type.startsWith('image/')) iconClass = 'fa-file-image';
        else if (file.type.startsWith('video/')) iconClass = 'fa-file-video';
        else if (file.type.startsWith('audio/')) iconClass = 'fa-file-audio';
        else if (file.type.includes('pdf')) iconClass = 'fa-file-pdf';
        else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) iconClass = 'fa-file-word';
        else if (file.type.includes('excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) iconClass = 'fa-file-excel';
        
        // 创建文件项并添加到列表
        const fileItem = document.createElement('div');
        fileItem.style.cssText = 'display: flex; align-items: center; padding: 10px; background-color: var(--surface-color); border-radius: 8px; margin-bottom: 10px; box-shadow: var(--shadow-default);';
        
        fileItem.innerHTML = `
            <div style="width: 40px; height: 40px; background-color: rgba(82, 113, 255, 0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
                <i class="fas ${iconClass}" style="color: var(--primary-color);"></i>
            </div>
            <div style="flex: 1;">
                <div style="font-size: 14px; color: var(--text-primary);">${file.name}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">${fileSize}</div>
            </div>
            <button class="remove-internet-file-btn" data-name="${file.name}" style="background: none; border: none; color: var(--error-color); font-size: 16px;">
                <i class="fas fa-times-circle"></i>
            </button>
        `;
        
        selectedFilesList.appendChild(fileItem);
        
        // 添加到文件数组
        window.selectedInternetFiles.push({
            file: file,
            name: file.name,
            size: fileSize,
            icon: iconClass
        });
    });
    
    // 如果有选择的文件，显示文件列表区域和传输按钮
    if (window.selectedInternetFiles.length > 0) {
        selectedInternetFiles.style.display = 'block';
    } else {
        selectedInternetFiles.style.display = 'none';
    }
    
    // 添加移除按钮事件
    const removeButtons = document.querySelectorAll('.remove-internet-file-btn');
    removeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fileName = e.currentTarget.getAttribute('data-name');
            const index = window.selectedInternetFiles.findIndex(item => item.name === fileName);
            if (index !== -1) {
                window.selectedInternetFiles.splice(index, 1);
                e.currentTarget.closest('div').remove();
                
                // 如果没有文件了，隐藏文件列表和传输按钮
                if (window.selectedInternetFiles.length === 0) {
                    selectedInternetFiles.style.display = 'none';
                }
            }
        });
    });
}

// 清空已选择的公网传输文件列表
function clearSelectedFiles() {
    const selectedFilesList = document.getElementById('selectedFilesList');
    const selectedInternetFiles = document.getElementById('selected-internet-files');
    
    selectedFilesList.innerHTML = '';
    window.selectedInternetFiles = [];
    
    // 隐藏文件列表区域和传输按钮
    selectedInternetFiles.style.display = 'none';
} 