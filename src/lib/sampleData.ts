export const SAMPLE_SALES_CSV = `order_id,customer_name,category,unit_price,quantity,discount_pct,total_amount,rating,order_date
1001,Aarav Sharma,Electronics,1200.50,1,10,1080.45,4.8,2026-08-01
1002,Priya Patel,Home & Kitchen,45.00,3,0,135.00,4.2,2026-08-02
1003,Rohan Verma,Books,18.99,2,5,36.08,4.9,2026-08-02
1004,Ananya Iyer,Fashion,89.50,1,15,76.08,3.9,2026-08-03
1005,Vikram Singh,Electronics,650.00,2,20,1040.00,4.7,2026-08-04
1006,Neha Gupta,Fitness,120.00,1,0,120.00,4.5,2026-08-04
1007,Siddharth Rao,Books,25.50,4,10,91.80,4.6,2026-08-05
1008,Kavita Desai,Home & Kitchen,310.00,1,12,272.80,4.1,2026-08-06
1009,Rahul Nair,Electronics,2100.00,1,5,1995.00,4.9,2026-08-07
1010,Sneha Roy,Fashion,140.00,2,10,252.00,4.3,2026-08-08
1011,Aditya Joshi,Fitness,85.00,3,15,216.75,4.4,2026-08-08
1012,Pooja Chopra,Home & Kitchen,62.00,2,0,124.00,4.0,2026-08-09
1013,Karan Malhotra,Electronics,450.00,1,8,414.00,4.6,2026-08-10
1014,Tanvi Shinde,Books,14.50,5,0,72.50,4.8,2026-08-11
1015,Amit Trivedi,Fashion,199.00,1,25,149.25,3.7,2026-08-12
1016,Ritu Sen,Home & Kitchen,180.00,2,10,324.00,4.5,2026-08-13
1017,Varun Mehta,Electronics,899.90,1,15,764.92,4.7,2026-08-14
1018,Ishita Kapoor,Fitness,299.00,1,5,284.05,4.9,2026-08-15
1019,Manish Reddy,Books,32.00,3,10,86.40,4.2,2026-08-16
1020,Divya Saxena,Fashion,110.00,2,12,193.60,4.1,2026-08-17
`;

export const SAMPLE_CUSTOMERS_CSV = `customer_name,city,tier,joined_year,active
Aarav Sharma,Mumbai,Platinum,2023,1
Priya Patel,Ahmedabad,Gold,2024,1
Rohan Verma,Delhi,Silver,2025,1
Ananya Iyer,Bengaluru,Gold,2023,1
Vikram Singh,Chandigarh,Platinum,2022,1
Neha Gupta,Pune,Silver,2025,0
Siddharth Rao,Hyderabad,Platinum,2023,1
Kavita Desai,Mumbai,Gold,2024,1
Rahul Nair,Kochi,Platinum,2021,1
Sneha Roy,Kolkata,Silver,2024,1
Aditya Joshi,Pune,Gold,2023,1
Pooja Chopra,Delhi,Silver,2025,1
Karan Malhotra,Gurugram,Gold,2024,1
Tanvi Shinde,Mumbai,Bronze,2026,1
Amit Trivedi,Jaipur,Silver,2024,0
`;

export const QUICK_QUERIES = [
  {
    label: 'Summary by Category',
    query: `SELECT 
  category, 
  COUNT(*) AS order_count, 
  ROUND(SUM(total_amount), 2) AS total_revenue, 
  ROUND(AVG(unit_price), 2) AS avg_unit_price,
  ROUND(AVG(rating), 2) AS avg_rating
FROM ecommerce_sales
GROUP BY category
ORDER BY total_revenue DESC;`,
  },
  {
    label: 'Customer Join Analysis',
    query: `SELECT 
  s.order_id, 
  s.customer_name, 
  c.city, 
  c.tier, 
  s.category, 
  s.total_amount
FROM ecommerce_sales s
JOIN customer_profiles c ON s.customer_name = c.customer_name
ORDER BY s.total_amount DESC;`,
  },
  {
    label: 'Top High-Value Orders',
    query: `SELECT order_id, customer_name, category, total_amount, rating
FROM ecommerce_sales
WHERE total_amount > 200
ORDER BY total_amount DESC;`,
  },
  {
    label: 'Table Schema Check',
    query: `PRAGMA table_info("ecommerce_sales");`,
  },
];
