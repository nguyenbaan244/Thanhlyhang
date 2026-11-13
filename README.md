# Thanh lý nội bộ

Nhân viên mở danh mục bằng mã truy cập chung, chọn một mặt hàng cho mỗi đơn, nhập họ tên, mã nhân viên và số lượng, rồi xác nhận. Mã nhân viên được ghi nhận theo thông tin tự khai. Giao dịch PostgreSQL kiểm tra giá, khóa dòng tồn, ghi đơn và trừ tồn. Có thể thử lại một yêu cầu chưa rõ kết quả trong cùng trang bằng mã đơn cũ.

## Dữ liệu và triển khai

1. Chạy [db.sql](db.sql) một lần trong SQL Editor của một dự án Supabase trống. Xuất các cột đã đối chiếu từ tệp nguồn thành CSV gồm `sku,name,price,stock`, rồi nhập vào bảng `products`. SKU phải duy nhất, giá là số nguyên VND, tồn là số nguyên không âm. Bảng `orders` chứa đơn và thông tin người đặt, xem trong Supabase Dashboard bằng tài khoản quản trị. Tồn vận hành nằm trong Supabase sau khi nhập.
2. Đẩy mã nguồn vào repo GitHub riêng tư. Import repo trong Vercel, chọn preset Other và giữ cấu hình trong `vercel.json`.
3. Trong Vercel, đặt `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (khóa service_role dạng JWT) và `SHOP_ACCESS_CODE` (mã ngẫu nhiên đủ dài). Triển khai lại sau khi đặt biến. Giữ khóa trong cấu hình máy chủ, giới hạn người có quyền xem bảng đơn và chỉ chia sẻ mã truy cập cho nhân viên. Mã chung có thể bị chuyển tiếp. Đổi mã nếu bị lộ.
4. Trên môi trường thử, kiểm tra một đơn hợp lệ, hai người cùng mua sản phẩm còn một đơn vị, và một lần gửi lại cùng mã đơn. Đối chiếu tồn và bảng đơn trước khi mở đợt thanh lý thật.

Trang tĩnh nằm trong `public/`, API Vercel nằm trong `api/`. Có thể chạy `vercel dev` với môi trường thử đã cấu hình.
