// 雷达显示和设备相关功能

// 添加动态波纹效果
function createRippleEffect() {
    const ripple = document.createElement('div');
    ripple.classList.add('ripple');
    
    const radarContainer = document.querySelector('.radar-container');
    radarContainer.appendChild(ripple);
    
    // 移除旧的波纹
    setTimeout(() => {
        ripple.remove();
    }, 3000);
}

// 初始创建波纹
document.addEventListener('DOMContentLoaded', () => {
    createRippleEffect();
    
    // 定时创建新波纹
    setInterval(createRippleEffect, 3000);
    
    // 点击设备图标
    const devices = document.querySelectorAll('.device');
    devices.forEach(device => {
        device.addEventListener('click', () => {
            // 取消之前选择的设备
            if (window.selectedDevice) {
                window.selectedDevice.classList.remove('selected');
            }
            
            // 选择当前设备
            device.classList.add('selected');
            window.selectedDevice = device;
            
            // 显示选择提示
            const deviceName = device.dataset.deviceName;
            alert(`已选择设备: ${deviceName}\n点击发送按钮选择要传输的文件`);
        });
    });
}); 