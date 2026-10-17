# Phân tích nguồn và animation

## Kiểm kê trước khi xây renderer

Gói project cũ chứa `index.html`, README và 18 ảnh; không có Reanim/âm thanh. Ảnh composite nhân vật được vẽ vào kích thước cố định rồi xoay/nhún cả ảnh. Canvas 1200×720 cộng các khối HTML bên ngoài gây tràn chiều cao desktop. Input đặt quân không kiểm tra tạm dừng; zombie bị hạ vẫn có thể hành động trong lượt cập nhật đó.

Nguồn bổ sung có 2.900 tệp: 2.368 PNG, 66 JPG, 8 GIF, 146 Reanim, 169 OGG, 2 MO3, 115 XML, cùng dữ liệu khác. Danh sách đường dẫn, dung lượng và SHA-256 đầy đủ: `asset-inventory.json` / CSV. Toàn bộ Reanim được parse để lập `reanim-inventory.json`. Chỉ bộ tài nguyên dùng trong game được đưa vào build.

## Dữ liệu thực tế

| Bộ | Track | Frame nguồn | FPS | Các đoạn dùng |
| --- | ---: | ---: | ---: | --- |
| PeaShooterSingle | 18 | 104 | 12 | full_idle 79–103; shooting 54–78; stem idle 4–28 |
| SunFlower | 29 | 29 | 12 | idle 4–28 |
| SnowPea | 20 | 104 | 12 | full_idle 79–103; shooting 54–78; stem idle 4–28 |
| Wallnut | 6 | 56 | 12 | idle 0–16 |
| Zombie | 42 | 504 | 12 | walk 44–90; eat 138–177; death 178–216 |

File là chuỗi XML fragment không có root. Mỗi `<t>` là một frame; thuộc tính vắng mặt kế thừa giá trị frame trước. Các giá trị khởi tạo là x/y/kx/ky/f=0, sx/sy/a=1, image rỗng. Giữ nguyên thứ tự track và tên track, kể cả trùng tên. `f=-1` ẩn bộ phận; image và visibility là giá trị rời rạc. Các bộ được dùng chỉ cần frame ảnh 0 và trạng thái ẩn, không có atlas nhiều cel phải suy đoán.

`kx` và `ky` là hai góc độc lập, không gộp thành một rotation. Canvas nhận ma trận:

```text
a = cos(kx) × sx       b = sin(kx) × sx
c = −sin(ky) × sy      d = cos(ky) × sy
e = x                 f = y
```

Góc đổi từ độ sang radian. PNG neo góc trên trái, giữ kích thước gốc; scale trong dữ liệu được giữ nguyên. Actor chỉ dùng một hệ số phóng đồng nhất. Nội suy x/y/scale/góc/alpha giữa hai frame; frame ảnh/visibility không nội suy. Chuyển trạng thái blend từ pose đang hiển thị trong 160 ms, đưa góc về nhánh gần nhất để tránh quay vòng khi đổi trạng thái. Chu kỳ dùng N−1 khoảng nội suy, tương ứng cơ chế loop không lặp frame cuối đầy đủ.

## Phát hiện qua scene riêng

- Peashooter dùng `PeaShooterSingle`; `PeaShooter` là bộ khác, có phần đầu/lá khác.
- Zombie chứa các track dành cho cờ, cửa lưới, phao, râu và nước. Phải lọc theo biến thể; chỉ mở `anim_cone` hoặc `anim_bucket` phù hợp.
- Đoạn shooting của hai cây đậu ẩn stem. Chuyển toàn actor sang shooting làm đầu lơ lửng. Đã giữ timeline stem idle độc lập, còn đầu phát shooting; có kiểm thử hồi quy kiểm tra các track thân luôn hiện qua toàn đoạn bắn.
- Wall-nut, nón, xô có ảnh hư hại sẵn trong kho: dùng ảnh gốc theo ngưỡng HP. Khi giáp hết, ẩn track đội đầu. Trúng đòn có flash ngắn; chết phát đoạn Reanim death một lần, giữ frame cuối rồi dọn actor.
- Đo đồng hồ trên sân đông phát hiện delta làm mượt của Phaser khiến mô phỏng trễ thời gian thực trong môi trường kiểm thử. Đã dùng đồng hồ đơn điệu `performance.now`, tick chiến đấu 1/60 giây và animation theo fps nguồn. Một lần gián đoạn được chặn ở 250 ms để tránh vòng cập nhật quá dài; chuyển tab tự tạm dừng.
- Tải render lớn nhất đến từ Canvas filter đổi màu trên từng bộ phận. Đã cache ảnh bộ phận trúng đòn/đóng băng vào canvas nhỏ, chỉ tạo một lần cho mỗi texture và kiểu màu; render thường không cần filter toàn mặt vẽ.

## Phạm vi đã kiểm chứng

Ảnh chụp `viewer-idle/eat/death/shoot/damaged.png`; kiểm tra pose thay đổi cho cả bảy actor, mọi ảnh tham chiếu có mặt, bộ phận thân không biến mất khi bắn, blend không nhảy tọa độ lúc bắt đầu chuyển trạng thái. Chưa tuyên bố tương đương pixel với engine PopCap cho toàn bộ 146 Reanim hoặc các hệ attachment/particle XML ngoài phạm vi năm bộ nhân vật này.
