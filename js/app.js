// js/app.js

// 1. 初始化 Supabase 客戶端 (使用 CDN 載入的版本會掛載在 window.supabase 下)
// 請確保 HTML 有載入 Supabase SDK (見下方補充)
const { createClient } = window.supabase;
const supabase = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

// 2. 抓取旅遊景點的函數
async function fetchTravelSpots() {
    const { data, error } = await supabase
        .from('travel_spots')
        .select('*');

    if (error) {
        console.error('抓取資料失敗:', error);
        return [];
    }
    return data;
}

// 3. 渲染畫面到網頁上
async function renderSpots() {
    const listElement = document.querySelector('ul');
    const spots = await fetchTravelSpots();

    if (spots.length > 0) {
        // 清空原本寫死的靜態內容
        listElement.innerHTML = ''; 
        
        spots.forEach(spot => {
            const li = document.createElement('li');
            // 這裡假設你的資料表欄位是 name 和 location，請根據實際資料表欄位修改
            li.textContent = `${spot.name} - ${spot.location || '未知地點'}`;
            listElement.appendChild(li);
        });
        
        // 成功載入後更新標題（選配）
        document.querySelector('h1').textContent = "Travel Spots 已連線 ✅";
    } else {
        console.log("目前資料庫是空的或是尚未建立 travel_spots 資料表");
    }
}

// 啟動程式
document.addEventListener('DOMContentLoaded', () => {
    renderSpots();
});
