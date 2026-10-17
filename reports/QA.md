# Kiểm thử bản build — 17/10/2026

Bản production được phục vụ từ `dist/` tại http://127.0.0.1:4173 và kiểm tra bằng Chrome qua Playwright, không chỉ chạy mã nguồn dev.

## Bằng chứng

- `browser-check.json`: thao tác bàn phím/chuột thật để đặt cây, thả quân, tạm dừng, kiểm tra va chạm, bảy nhân vật, zoom và ánh xạ chuột khi thu nhỏ. `errors: []` gồm cả JavaScript exception và Console error.
- `viewer-check.json`: pose của cả bảy actor thay đổi theo thời gian; không có lỗi JavaScript.
- `unit-tests.json`: 10 kiểm thử logic, va chạm swept, cây bị ăn, tài nguyên, hồi chiêu, pause, thắng thua, kế thừa dữ liệu, blend và stem khi bắn.
- `performance.json`: thử 20 cây + 15 zombie trên Chrome headless, ghi thời gian thực, thời gian mô phỏng và FPS đo được. FPS phụ thuộc máy và môi trường; không phải cam kết 60 fps.
- `battle-1366.png`, `battle-1920.png`, `battle-1024.png`, `battle-800.png`: kiểm tra toàn canvas nằm trong viewport và trang không có cuộn dọc.
- `plants-win.png`, `zombies-win.png`: kiểm tra hai màn thắng. Trường hợp này dùng fixture đặt đồng hồ gần hết / số đột nhập gần ngưỡng; không giả rằng đã chờ đủ ba phút trong mỗi lần browser test.

Các fixture chỉ được thiết lập từ script kiểm thử; trận chơi bình thường bắt đầu với 250 mặt trời và 150 não, không có quân đặt sẵn. Screenshot chiến đấu dùng fixture tài nguyên cao để kiểm tra đủ bảy loại trong một cảnh.

## Mô phỏng

`simulation.json` lưu 360 trận ở tick 1/60 giây, 30 seed cho mỗi cặp trong 4 chiến thuật cây × 3 chiến thuật zombie. Bot gọi chính `Battle.place`, `Battle.spawn`, `Battle.step` như bản browser và kiểm tra tài nguyên không âm, không trùng ô, không vượt 45 cây.

Phe cây thắng 238/360 trận trong bộ bot này. Tích lũy kinh tế quá lâu thất bại rõ trước zombie rải hàng; chiến thuật cây phản ứng theo mối đe dọa đạt tỷ lệ thắng cao trước bot đánh tập trung. Bot cố định có thiên lệch, nên không dùng tỷ lệ tổng để tuyên bố game đã cân bằng. Các thông số hiện tại là điểm khởi đầu cho thử nghiệm hai người thật.

## Những lỗi đã sửa khi kiểm thử

- Đặt quân được lúc pause trong project cũ.
- Zombie chết vẫn cắn/đột nhập trong tick bị hạ.
- Đạn bỏ qua mục tiêu khi bước cập nhật lớn: dùng đoạn quét và chọn mục tiêu gần nhất.
- Phím R xung đột hàng thứ tư: dùng N cho ván mới.
- Mất thân cây trong đoạn bắn: lớp stem riêng.
- Chữ thẻ quân đè chữ có sẵn trên ảnh packet; giá và cooldown giờ hiển thị đồng thời.
- Thiếu favicon gây Console 404.
- Đồng hồ trễ trên sân đông: thời gian đơn điệu và tick cố định.
- Bộ lọc Canvas trên từng bộ phận gây giật khi trúng đòn/đóng băng: chuyển sang cache ảnh bộ phận đã đổi màu. Bài đo cuối với 35 nhân vật đạt khoảng 59,4 fps; 5,016 giây thực tương ứng 5,05 giây mô phỏng, sai lệch khoảng 0,7%.

Mọi tài nguyên chạy game và thư viện Phaser nằm trong build; server dùng Node built-in. Chưa có thử nghiệm đối kháng người thật dài hạn, chưa chuyển nhạc MO3, chưa kiểm tra mobile cảm ứng hoặc gamepad.
