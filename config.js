// config.js
const supabaseConfig = {
    url: 'https://ouuaxqvjfzyapwutmqyf.supabase.co',
    anonKey: 'lmVUBPyAL2rhTfrAMyR2eg_JZ64dOjJ', // 建議確認一下 key 是否複製完整
};

// 將設定掛載到 window，讓 app.js 可以抓到
window.SUPABASE_CONFIG = supabaseConfig;
