// js/app.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 檢查必要的資源是否到位
    if (!window.supabase || !window.SUPABASE_CONFIG) {
        console.error("❌ 資源未載入成功，請檢查 HTML 中的 SDK 連結或 config.js");
        return;
    }

    try {
        // 2. 初始化 Supabase 客戶端 (將變數改名為 sbClient 避免重複宣告衝突)
        const { createClient } = window.supabase;
        const sbClient = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
        
        console.log("🚀 Supabase 初始化成功，準備抓取資料...");

        // 3. 從資料表抓取資料
        const { data, error } = await sbClient
            .from('travel_spots')
            .select('*');

        const listElement = document.getElementById('travel-list');

        if (error) {
            console.error('❌ 抓取失敗:', error.message);
            listElement.innerHTML = `<li>讀取錯誤: ${error.message}</li>`;
            return;
        }

        // 4. 渲染到網頁
        listElement.innerHTML = ''; // 清空「載入中...」

        if (!data || data.length === 0) {
            listElement.innerHTML = '<li>目前資料庫沒有旅遊景點 🏖️</li>';
            console.log("資料庫回傳空陣列，請檢查後台 Table 是否有資料");
        } else {
            data.forEach(spot => {
                const li = document.createElement('li');
                // 💡 注意：這裡的 spot.name 必須對應你資料表的欄位名稱
                li.textContent = `${spot.name || '未命名'} (${spot.location || '未知位置'})`;
                listElement.appendChild(li);
            });
            console.log("✅ 資料渲染完成:", data);
        }

    } catch (err) {
        console.error("系統執行錯誤:", err);
    }
});
