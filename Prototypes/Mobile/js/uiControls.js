// UI控制相关代码

document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const settingsBtn = document.getElementById('settingsBtn');
    const closeSettings = document.getElementById('closeSettings');
    const settingsPanel = document.getElementById('settingsPanel');
    const receiveBtn = document.getElementById('receiveBtn');
    const receivePanel = document.getElementById('receivePanel');
    const appContent = document.querySelector('.app-content');
    const panelBackdrop = document.getElementById('panelBackdrop');
    
    // 打开设置面板
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            openPanel(settingsPanel);
        });
    }
    
    // 关闭设置面板
    if (closeSettings) {
        closeSettings.addEventListener('click', () => {
            closePanel(settingsPanel);
        });
    }
    
    // 接收文件按钮
    if (receiveBtn) {
        receiveBtn.addEventListener('click', () => {
            openPanel(receivePanel);
        });
    }
    
    // 接收面板下滑关闭功能
    if (receivePanel) {
        let startY, currentY;
        let isDragging = false;
        
        // 触摸开始
        receivePanel.addEventListener('touchstart', function(e) {
            startY = e.touches[0].clientY;
            isDragging = true;
        });
        
        // 触摸移动
        receivePanel.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
            
            currentY = e.touches[0].clientY;
            const diffY = currentY - startY;
            
            // 只允许向下滑动
            if (diffY > 0) {
                receivePanel.style.transform = `translateY(${diffY}px)`;
                e.preventDefault();
            }
        });
        
        // 触摸结束
        receivePanel.addEventListener('touchend', function() {
            if (!isDragging) return;
            
            const diffY = currentY - startY;
            
            // 如果滑动超过面板高度的20%，关闭面板
            if (diffY > receivePanel.offsetHeight * 0.2) {
                closePanel(receivePanel);
            } else {
                // 否则恢复原位
                receivePanel.style.transform = '';
            }
            
            isDragging = false;
        });
    }
    
    // 标签切换功能
    const tabs = document.querySelectorAll('.tab');
    if (tabs.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                
                // 激活当前标签
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // 显示对应内容
                const tabContents = document.querySelectorAll('.tab-content');
                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(tabId + 'Tab').classList.add('active');
            });
        });
    }
    
    // 点击遮罩层关闭面板
    if (panelBackdrop) {
        panelBackdrop.addEventListener('click', () => {
            if (settingsPanel.classList.contains('show')) {
                closePanel(settingsPanel);
            }
            if (receivePanel.classList.contains('show')) {
                closePanel(receivePanel);
            }
        });
    }
    
    // 通用打开面板函数
    function openPanel(panel) {
        panel.classList.add('show');
        panelBackdrop.classList.add('show');
        appContent.classList.add('panel-open');
    }
    
    // 通用关闭面板函数
    function closePanel(panel) {
        panel.classList.remove('show');
        panel.style.transform = '';
        // 检查是否还有其他面板打开
        const anyPanelOpen = document.querySelector('.settings-panel.show, .receive-panel.show, .file-selector.show');
        if (!anyPanelOpen) {
            panelBackdrop.classList.remove('show');
            appContent.classList.remove('panel-open');
        }
    }
    
    // 使函数全局可用
    window.openPanel = openPanel;
    window.closePanel = closePanel;
}); 