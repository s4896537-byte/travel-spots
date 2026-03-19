// js/app.js

// 🔴 刪除原本的 import { createClient } ... 這行

document.addEventListener('DOMContentLoaded', async () => {
    // 檢查資源是否載入
    if (!window.supabase || !window.SUPABASE_CONFIG) {
        console.error("Supabase SDK 或設定檔載入失敗");
        return;
    }

    // 初始化
    const { createClient } = window.supabase;
    const supabase = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

    // 抓取資料並渲染
    const { data, error } = await supabase.from('travel_spots').select('*');

    const listElement = document.getElementById('travel-list');
    
    if (error) {
        console.error('抓取資料失敗:', error.message);
        listElement.innerHTML = `<li>讀取錯誤: ${error.message}</li>`;
    } else {
        listElement.innerHTML = ''; // 清空載入中
        if (data.length === 0) {
            listElement.innerHTML = '<li>目前沒有資料</li>';
        } else {
            data.forEach(spot => {
                const li = document.createElement('li');
                // 這裡請根據你資料表的欄位名稱調整，例如 spot.name
                li.textContent = `${spot.name || '未命名地點'}`; 
                listElement.appendChild(li);
            });
        }
    }
});
