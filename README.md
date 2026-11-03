# Tìm điểm khác biệt online

## 1. Chạy thử trên máy
1. Cài Node.js bản LTS (>= 18) từ https://nodejs.org
2. Mở Terminal (Mac) hoặc Command Prompt/PowerShell (Windows) NGAY TRONG thư mục đã giải nén (thấy file server.js).
3. Chạy:  `npm install`   (chỉ lần đầu)  rồi  `npm start`
4. Mở http://localhost:3000  — mở thêm tab/điện thoại cùng Wi-Fi (http://IP-máy:3000) để thử nhiều người.
   Phòng riêng: thêm `?r=tenphong`, ví dụ http://localhost:3000/?r=lop10a

## 2. Đưa lên mạng (Render.com, miễn phí)
1. Tạo tài khoản github.com → New repository → "uploading an existing file" → kéo TOÀN BỘ nội dung thư mục (server.js, package.json, levels.json, public/ ...) vào → Commit. (Không cần upload node_modules.)
2. render.com → New → Web Service → kết nối GitHub → chọn repo.
3. Build Command: `npm install`   Start Command: `npm start`   Plan: Free.
4. (Tuỳ chọn, để bật quản trị) Environment → thêm `ADMIN_KEY` = một mật khẩu bạn tự đặt.
5. Deploy xong có link https://xxx.onrender.com — gửi cho mọi người.
Mỗi lần sửa file trên GitHub, Render tự deploy lại sau ~1–2 phút.

## 3. Thêm màn chơi mới (không cần sửa code)
1. Chuẩn bị 2 ảnh CÙNG kích thước (nên khoảng 1600x900, jpg dưới 1MB mỗi ảnh). Đặt tên không dấu, không dấu cách, ví dụ cho-meo-a.jpg / cho-meo-b.jpg.
2. Mở https://LINK-CỦA-BẠN/picker.html → chọn ảnh A và ảnh B → gõ tên màn → click vào giữa từng chỗ khác biệt → bấm Copy.
3. Trên GitHub: vào thư mục public/images → Add file → Upload files → kéo 2 ảnh vào → Commit. (Tên file phải đúng như công cụ báo.)
4. Trên GitHub: mở levels.json → bút chì (Edit) → dán khối vừa copy vào cuối danh sách (thêm dấu phẩy sau màn trước) → Commit changes.
5. Đợi Render deploy lại (1–2 phút). Nếu sai gì, xem tab Logs của Render: server báo rõ màn nào, lỗi gì.

## 4. Quản trị
Đặt biến môi trường `ADMIN_KEY` (Render: Environment; máy local: `ADMIN_KEY=matkhau npm start`).
Vào link dạng  `https://xxx.onrender.com/?admin=matkhau&r=tenphong` → có bảng "Quản trị": chuyển màn, chơi lại màn, xoá điểm.
Người không có key không thể dùng các lệnh này (server tự kiểm tra).

## 5. Cấu trúc
- `server.js` – máy chủ, chấm điểm, giữ đáp án (đáp án không bao giờ gửi cho người chơi).
- `levels.json` – dữ liệu các màn (nơi bạn sửa nhiều nhất).
- `public/index.html` – giao diện chơi · `public/picker.html` – công cụ lấy toạ độ · `public/images/` – ảnh.
