// config.js
const SUPABASE_CONFIG = {
    url: 'https://ouuaxqvjfzyapwutmqyf.supabase.co',
    anonKey: 'lmVUBPyAL2rhTfrAMyR2eg_JZ64dOjJ',
};

// 為了確保 app.js 能抓到，我們不使用 export，讓它成為全域變數
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
