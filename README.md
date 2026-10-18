# PvZ Duel — Sân nhà đại chiến

Bản thử nghiệm PvP hai người trên một màn hình hoặc qua phòng online, xây lại bằng **Phaser 3.90 + TypeScript**. Nhân vật ghép từ PNG bộ phận và chạy dữ liệu Reanim gốc; không dùng ảnh nhân vật tĩnh lắc qua lại.

## Chơi ngay

1. Cần Node.js 20+ trên máy (máy hiện tại đã có).
2. Chạy `START_GAME.cmd`, giữ cửa sổ server mở.
3. Mở **http://127.0.0.1:4173/** trong Chrome hoặc Edge.
4. Nhấn Enter để bắt đầu. Không cần Internet, npm install hay CDN để chơi bản `dist` đã đóng gói.

Animation viewer: **http://127.0.0.1:4173/?viewer**. Không mở `dist/index.html` bằng `file://`, vì game tải manifest và âm thanh qua HTTP local.

## Điều khiển

| Người chơi / chức năng | Phím và chuột |
| --- | --- |
| Người 1 | 1–4 chọn cây; bấm ô cỏ để trồng |
| Người 1, chỉ bàn phím | Mũi tên chọn ô, Enter trồng |
| Người 2 | 7–9 chọn zombie; Q/W/E/R/T thả vào hàng 1/2/3/4/5 |
| Người 2, chuột | Chọn thẻ zombie rồi bấm làn bên phải |
| Tạm dừng | Space hoặc nút DỪNG / TIẾP |
| Ván mới | N |
| Âm thanh | M hoặc nút ÂM |
| Thu nhỏ / phóng lại | − / +, giới hạn tối đa vừa viewport để giữ toàn sân |
| Viewer | V hoặc REANIM LAB; G quay lại game |

Hai người có thể chơi đồng thời bằng hai nhóm phím riêng. R được dành cho hàng zombie thứ tư; N là phím ván mới. Ở chế độ cùng máy, chuyển tab sẽ tự tạm dừng. Online tiếp tục khi kết nối vẫn hoạt động.

Phe cây thắng khi phòng thủ hết 180 giây. Phe zombie thắng khi đạt 5 lần đột nhập. Nếu cả hai xảy ra trong cùng tick, đột nhập có ưu tiên. Sunflower tự thu mặt trời để không tranh chuột giữa hai người. Tài nguyên, HP, tốc độ, sát thương, hồi chiêu và giới hạn đặt trong `src/config.ts`.

## Reanim

Viewer hiển thị đủ Sunflower, Peashooter, Wall-nut, Snow Pea, Zombie thường, Conehead và Buckethead.

- Space dừng; mũi tên phải tiến một frame nguồn.
- W đi, E ăn, D chết, S bắn, I idle.
- H kiểm tra phản hồi trúng đòn và các mức nứt của Wall-nut, nón và xô.
- G quay lại game.

Đọc `reports/REANIM_ANALYSIS.md` để xem cách xử lý frame kế thừa, ma trận, thứ tự vẽ và việc tách lớp thân/đầu khi bắn. Năm tệp Reanim nguồn được giữ trong `source-reanim/`.

## Phát triển và kiểm thử

```text
npm ci
npm run dev
npm test
npm run simulate
npm run build
node tools/serve.mjs
```

Sau khi local server 4173 chạy, dùng PowerShell:

```powershell
$env:TEST_URL = 'http://127.0.0.1:4173/'
node tools/browser-check.mjs
node tools/viewer-check.mjs
node tools/performance-check.mjs
```

Kiểm thử trình duyệt dùng Google Chrome đã cài trên máy, qua Playwright. Có thể đổi `channel` trong script nếu máy khác không có Chrome.

Để chuyển đổi lại toàn bộ tài nguyên nguồn, giải nén kho PvZ_Assets rồi đặt biến môi trường `PVZ_ASSETS` trỏ vào thư mục chứa `reanim`, `images`, `particles`, `sounds`. Chạy `npm run prepare-assets`. Công cụ kiểm kê toàn kho, phân tích tất cả 146 Reanim, chọn tài nguyên cần dùng và dừng nếu thiếu PNG của nhân vật. Build thông thường dùng sẵn `public/assets`, không cần tải lại nguồn.

## Kết quả và giới hạn

- Bản production đã chạy thật trong Chrome; ảnh chụp và kết quả ở `reports/`.
- 10 kiểm thử logic/Reanim và 360 trận mô phỏng dùng chung `Battle` với game.
- Kiểm tra 1366×768, 1920×1080, 1024×600, 800×600; toàn sân vừa viewport, không cuộn trang.
- Kiểm tra đặt cây, thả zombie, hồi chiêu, tạm dừng, va chạm, animation, hai điều kiện thắng và không có lỗi Console.
- Mô phỏng chỉ đo 12 cặp chiến thuật bot, không thay thế thử nghiệm hai người thật và không chứng minh cân bằng tuyệt đối.
- Renderer hiện hỗ trợ định dạng Reanim XML của kho nguồn này. Không có bộ giải mã `.reanim.compiled` nhị phân, không tuyên bố đã kiểm chứng trực quan mọi nhân vật trong 146 tệp.
- Âm thanh hành động dùng OGG gốc; nhạc tracker MO3 chưa chuyển đổi. Chưa có nhạc nền liên tục.

## Nguồn tài nguyên

Ảnh, âm thanh và Reanim: [FregD156/PvZ_Assets](https://github.com/FregD156/PvZ_Assets), tải ngày 17/10/2026 theo yêu cầu tìm nguồn trên mạng. Tài nguyên Plants vs. Zombies thuộc PopCap/EA; project này là bản thử nghiệm cá nhân theo phạm vi yêu cầu.

Tham chiếu ý nghĩa ma trận/nội suy: [Reanimator.cpp](https://github.com/Patoke/re-plants-vs-zombies/blob/main/Sexy.TodLib/Reanimator.cpp). Renderer TypeScript được viết riêng cho project này. Project HTML cũ của người dùng chỉ dùng để đối chiếu gameplay và lỗi, không dùng ảnh composite cũ để giả animation.

## Chơi online qua Internet

1. Chạy `npm ci`, `npm run build`, rồi `npm start` (hoặc `START_GAME.cmd`). Máy chủ phục vụ game và API trên cổng 4173. Có thể đổi cổng bằng biến môi trường `PORT` và địa chỉ lắng nghe bằng `HOST`.
2. Để chơi khác mạng, cần triển khai máy chủ này lên hosting Node.js/container có URL HTTPS công khai. Repository đã có Dockerfile: `docker build -t pvz-duel .`, rồi `docker run --rm -p 4173:4173 pvz-duel`. Trỏ dịch vụ hosting tới cổng 4173 hoặc giá trị PORT. Chạy một instance; phòng lưu trong RAM và mất khi khởi động lại.
3. Cả hai mở cùng URL công khai. Chủ phòng bấm **Tạo phòng → Sao chép link mời**, gửi link cho bạn. Người nhận mở link và bấm **Vào phòng**, hoặc nhập mã phòng 8 ký tự.
4. Chủ phòng chơi cây, người vào chơi zombie. Khi đủ hai người, chủ phòng nhấn **Bắt đầu / Chơi lại**. Bấm tiêu đề bảng online để thu gọn trong trận.

Địa chỉ localhost/127.0.0.1 chỉ hoạt động trên máy chủ, không thể gửi cho người ở khác mạng. Hiện repository chưa được triển khai lên một URL Internet. Với cùng LAN, dùng địa chỉ IP LAN của máy chủ.

Máy chủ quyết định tài nguyên, vị trí, sát thương và kết quả. Client gửi lệnh và nhận trạng thái khoảng 10 lần/giây. Mỗi người chỉ điều khiển phe của mình. Khi một người mất kết nối quá 5 giây, mô phỏng dừng; tải lại cùng tab sẽ khôi phục ghế qua sessionStorage. Phòng hết hạn sau 30 phút không hoạt động. **Rời phòng** đóng phòng cho cả hai. Chơi lại do chủ phòng thực hiện khi ván kết thúc. Chưa có đổi phe, khán giả hoặc lưu phòng qua lần khởi động máy chủ.

Kiểm thử: `npm run test:online` sau khi build. Script chạy máy chủ riêng ở cổng 4187, kiểm tra API và hai phiên Edge. Có thể đặt `BROWSER_CHANNEL=chrome` để dùng Chrome. Khi phát triển với Vite, chạy thêm `npm start` để proxy `/api` hoạt động.

### Dùng chung host bot Discord

Đã chuẩn bị Docker Compose và workflow GHCR cho repository game hiện tại. Xem [deploy/README.md](deploy/README.md) để dùng cùng host/Cloudflare Tunnel với bot Discord. SSH tới host ghi trong tài liệu bot chưa kết nối được từ máy hiện tại; chưa triển khai live. Firebase chưa cần cho các phòng tạm thời và chưa được tích hợp.
