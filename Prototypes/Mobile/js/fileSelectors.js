// 文件选择器相关代码

// 全局变量
window.selectedInternetFiles = []; // 存储用户选择的公网传输文件
window.selectedLocalFilesArray = []; // 存储用户选择的局域网传输文件
window.selectedDevice = null; // 选中的设备

document.addEventListener('DOMContentLoaded', () => {
    // 选择DOM元素
    const fileSelector = document.getElementById('fileSelector');
    const closeFileSelector = document.getElementById('closeFileSelector');
    const localFileInput = document.getElementById('local-file-input');
    const localFolderInput = document.getElementById('local-folder-input');
    const selectedLocalFiles = document.getElementById('selected-local-files');
    const localFilesList = document.getElementById('local-files-list');
    const startLocalTransfer = document.getElementById('start-local-transfer');
    const appContent = document.querySelector('.app-content');
    const panelBackdrop = document.getElementById('panelBackdrop');
    
    // 打开文件选择器
    const sendFileBtn = document.getElementById('sendFileBtn');
    if (sendFileBtn) {
        sendFileBtn.addEventListener('click', () => {
            fileSelector.classList.add('show');
            panelBackdrop.classList.add('show');
            appContent.classList.add('panel-open');
            
            // 根据是否选择了设备显示对应内容在internetFileTransfer.js中处理
        });
    }
    
    // 关闭文件选择器
    closeFileSelector.addEventListener('click', () => {
        fileSelector.classList.remove('show');
        panelBackdrop.classList.remove('show');
        appContent.classList.remove('panel-open');
    });
    
    // 点击遮罩层关闭文件选择器
    panelBackdrop.addEventListener('click', (e) => {
        if (fileSelector.classList.contains('show')) {
            fileSelector.classList.remove('show');
            panelBackdrop.classList.remove('show');
            appContent.classList.remove('panel-open');
        }
    });
    
    // 局域网文件选择处理
    localFileInput.addEventListener('change', (e) => {
        handleLocalFileSelection(e.target.files);
    });
    
    localFolderInput.addEventListener('change', (e) => {
        handleLocalFileSelection(e.target.files);
    });
    
    // 开始局域网传输按钮事件
    startLocalTransfer.addEventListener('click', () => {
        if (window.selectedLocalFilesArray.length > 0 && window.selectedDevice) {
            fileSelector.classList.remove('show');
            panelBackdrop.classList.remove('show');
            // 主内容的缩放效果不移除，因为传输进度面板会立即显示
            window.startFileTransfer('local');
        }
    });
});

// 处理局域网文件选择
function handleLocalFileSelection(files) {
    if (!files || files.length === 0) return;
    
    const localFilesList = document.getElementById('local-files-list');
    const selectedLocalFiles = document.getElementById('selected-local-files');
    
    // 清空之前选择的文件
    window.selectedLocalFilesArray = Array.from(files);
    localFilesList.innerHTML = '';
    
    // 添加文件到列表
    window.selectedLocalFilesArray.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.style.cssText = 'display: flex; align-items: center; padding: 10px; background-color: var(--surface-color); border-radius: 8px; margin-bottom: 10px; box-shadow: var(--shadow-default);';
        
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
            <div style="margin-right: 10px; width: 30px; height: 30px; background-color: rgba(82, 113, 255, 0.1); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                <i class="fas ${iconClass}" style="color: var(--primary-color);"></i>
            </div>
            <div style="flex: 1; overflow: hidden;">
                <div style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary);">${file.name}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">${fileSize}</div>
            </div>
            <button class="remove-local-file-btn" data-index="${window.selectedLocalFilesArray.indexOf(file)}" style="background: none; border: none; color: var(--error-color); font-size: 16px;">
                <i class="fas fa-times-circle"></i>
            </button>
        `;
        
        localFilesList.appendChild(fileItem);
    });
    
    // 显示已选择文件列表
    selectedLocalFiles.style.display = 'block';
    
    // 添加移除按钮事件
    const removeButtons = document.querySelectorAll('.remove-local-file-btn');
    removeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            if (index >= 0) {
                window.selectedLocalFilesArray.splice(index, 1);
                // 重新渲染列表
                handleLocalFileSelection(window.selectedLocalFilesArray);
                
                // 如果没有文件了，隐藏列表
                if (window.selectedLocalFilesArray.length === 0) {
                    selectedLocalFiles.style.display = 'none';
                }
            }
        });
    });
} 