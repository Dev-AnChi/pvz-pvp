# Dùng chung host với bot Discord

PvZ dùng service Node.js riêng trên cùng Docker host, giữ nguyên combat TypeScript đã kiểm thử. Bot Python vẫn chạy độc lập. Không cần chép firebase_key.json vào image/game hoặc đưa khóa Firebase ra trình duyệt.

## Những gì đã xác minh

- Bot dùng Python + firebase-admin/Firestore, chạy bằng Docker Compose.
- Tài liệu bot mô tả GHCR + deploy webhook và Cloudflare Tunnel trên host.
- Remote của game là Dev-AnChi/pvz-pvp, khác owner ngocy007 của bot. Image game là ghcr.io/dev-anchi/pvz-pvp:latest. Quyền kéo image của bot không tự chứng minh quyền kéo image game.
- SSH tới it@10.10.30.7 từ môi trường hiện tại timeout. Cần VPN/đường mạng tới host hoặc địa chỉ SSH hiện hành trước khi triển khai.

## Triển khai khi truy cập được host

1. Push phiên bản đã review lên main để workflow build/test/push image. Workflow không tự deploy nếu chưa đặt DEPLOY_WEBHOOK_URL. Có thể chạy workflow_dispatch.
2. Tạo thư mục riêng trên host, ví dụ /home/it/pvz-pvp; chép docker-compose.yml và deploy/deploy.sh vào đó. Đảm bảo port localhost 4173 đang trống; nếu bận chỉ đổi vế cổng host trong compose.
3. Nếu image private, đăng nhập GHCR bằng tài khoản có quyền read:packages của Dev-AnChi/pvz-pvp. Không giả định credential của bot có quyền này.
4. Chạy `bash deploy/deploy.sh`; kiểm tra `docker compose ps` và `curl -I http://127.0.0.1:4173/`.
5. Trong Cloudflare Tunnel đang có, thêm hostname dành cho game trỏ tới `http://localhost:4173`. Cả giao diện và /api dùng chung hostname. Giữ Host header công khai khi reverse proxy; không cache /api/*. Domain deploy webhook vẫn phục vụ deploy, không phải URL game.
6. Mở URL HTTPS game từ hai mạng khác nhau; tạo phòng, gửi link mời, vào phòng, bắt đầu trận và thử tải lại tab.

## Tự động triển khai tùy chọn

Sau khi đã chạy thủ công thành công, thêm một entry mới cho PvZ vào mảng hooks hiện hữu (không ghi đè entry của bot), trỏ execute-command tới deploy/deploy.sh và chmod +x script. Tạo token riêng cho hook; cấu hình Actions variable DEPLOY_WEBHOOK_URL và secret DEPLOY_WEBHOOK_TOKEN trong repo game. Không commit token vào source.

## Database

Phòng và mô phỏng trận hiện ở RAM của một instance PvZ. Không ghi trạng thái mỗi tick lên Firestore. Firebase chưa được tích hợp; có thể dùng cùng project của bot để lưu lịch sử/kết quả trận trong collection riêng nếu cần. Restart/deploy sẽ mất các phòng đang chạy. Không bật nhiều replica với phiên bản này.

## Phạm vi thay đổi

Các file triển khai được chuẩn bị trong repo game. Chưa sửa repo bot, chưa push GitHub, chưa cập nhật host hoặc Cloudflare; cần kết nối host và hostname game để hoàn tất phần live.
