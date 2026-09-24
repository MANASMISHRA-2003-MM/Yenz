--
-- PostgreSQL database dump
--

\restrict 1JsbzdE9H2m5EYNUeOCjL0kJOScVdEKxsDukuDVs97cur4rnOnEgA5cM9VuQIWx

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

-- Started on 2026-09-24 13:17:19

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 16704)
-- Name: addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.addresses (
    address_id bigint NOT NULL,
    user_id bigint NOT NULL,
    label character varying(30),
    address_line character varying(255) NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(100) NOT NULL,
    pincode character varying(10) NOT NULL,
    latitude numeric(10,7),
    longitude numeric(10,7),
    is_default boolean DEFAULT false NOT NULL
);


ALTER TABLE public.addresses OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16703)
-- Name: addresses_address_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.addresses ALTER COLUMN address_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.addresses_address_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 226 (class 1259 OID 16747)
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    category_id bigint NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(120) NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16746)
-- Name: categories_category_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.categories ALTER COLUMN category_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.categories_category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 230 (class 1259 OID 16791)
-- Name: coupons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coupons (
    coupon_id bigint NOT NULL,
    code character varying(50) NOT NULL,
    discount_type character varying(20) NOT NULL,
    discount_value numeric(10,2) NOT NULL,
    min_order_value numeric(10,2) DEFAULT 0 NOT NULL,
    max_discount numeric(10,2),
    valid_from timestamp with time zone,
    valid_to timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT coupons_type_check CHECK (((discount_type)::text = ANY ((ARRAY['flat'::character varying, 'percentage'::character varying])::text[]))),
    CONSTRAINT coupons_value_check CHECK ((discount_value >= (0)::numeric))
);


ALTER TABLE public.coupons OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16790)
-- Name: coupons_coupon_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.coupons ALTER COLUMN coupon_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.coupons_coupon_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 240 (class 1259 OID 16912)
-- Name: deliveries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deliveries (
    delivery_id bigint NOT NULL,
    order_id bigint NOT NULL,
    delivery_partner_id bigint NOT NULL,
    status character varying(30) DEFAULT 'assigned'::character varying NOT NULL,
    pickup_at timestamp with time zone,
    delivered_at timestamp with time zone,
    current_latitude numeric(10,7),
    current_longitude numeric(10,7),
    CONSTRAINT delivery_status_check CHECK (((status)::text = ANY ((ARRAY['assigned'::character varying, 'waiting_pickup'::character varying, 'picked_up'::character varying, 'out_for_delivery'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.deliveries OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16911)
-- Name: deliveries_delivery_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.deliveries ALTER COLUMN delivery_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.deliveries_delivery_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 238 (class 1259 OID 16896)
-- Name: delivery_partners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_partners (
    delivery_partner_id bigint NOT NULL,
    name character varying(100) NOT NULL,
    phone character varying(15) NOT NULL,
    vehicle_type character varying(30),
    vehicle_number character varying(30),
    status character varying(30) DEFAULT 'offline'::character varying NOT NULL,
    latitude numeric(10,7),
    longitude numeric(10,7),
    CONSTRAINT delivery_partner_status_check CHECK (((status)::text = ANY ((ARRAY['available'::character varying, 'busy'::character varying, 'offline'::character varying])::text[])))
);


ALTER TABLE public.delivery_partners OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16895)
-- Name: delivery_partners_delivery_partner_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.delivery_partners ALTER COLUMN delivery_partner_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.delivery_partners_delivery_partner_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 234 (class 1259 OID 16855)
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    order_item_id bigint NOT NULL,
    order_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    line_total numeric(10,2) NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16854)
-- Name: order_items_order_item_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.order_items ALTER COLUMN order_item_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.order_items_order_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 232 (class 1259 OID 16809)
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    order_id bigint NOT NULL,
    user_id bigint NOT NULL,
    vendor_id bigint NOT NULL,
    address_id bigint NOT NULL,
    coupon_id bigint,
    subtotal numeric(10,2) NOT NULL,
    delivery_fee numeric(10,2) DEFAULT 0 NOT NULL,
    discount numeric(10,2) DEFAULT 0 NOT NULL,
    tax numeric(10,2) DEFAULT 0 NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    status character varying(30) DEFAULT 'placed'::character varying NOT NULL,
    payment_status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    placed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT orders_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[]))),
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['placed'::character varying, 'confirmed'::character varying, 'preparing'::character varying, 'out_for_delivery'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16808)
-- Name: orders_order_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.orders ALTER COLUMN order_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.orders_order_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 236 (class 1259 OID 16878)
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    payment_id bigint NOT NULL,
    order_id bigint NOT NULL,
    transaction_id character varying(100),
    provider character varying(50),
    method character varying(30),
    amount numeric(10,2) NOT NULL,
    status character varying(30) NOT NULL,
    paid_at timestamp with time zone,
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'success'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[])))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16877)
-- Name: payments_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.payments ALTER COLUMN payment_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.payments_payment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 228 (class 1259 OID 16760)
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    product_id bigint NOT NULL,
    vendor_id bigint NOT NULL,
    category_id bigint NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    discount_price numeric(10,2),
    image_url text,
    is_veg boolean DEFAULT true NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT products_discount_check CHECK (((discount_price IS NULL) OR (discount_price >= (0)::numeric))),
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric))
);


ALTER TABLE public.products OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16759)
-- Name: products_product_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.products ALTER COLUMN product_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.products_product_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 242 (class 1259 OID 16936)
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    review_id bigint NOT NULL,
    user_id bigint NOT NULL,
    vendor_id bigint NOT NULL,
    order_id bigint NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 16935)
-- Name: reviews_review_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.reviews ALTER COLUMN review_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.reviews_review_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 220 (class 1259 OID 16679)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id bigint NOT NULL,
    full_name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    phone character varying(15) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'customer'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['customer'::character varying, 'vendor'::character varying, 'admin'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'blocked'::character varying, 'inactive'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16678)
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.users ALTER COLUMN user_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.users_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 224 (class 1259 OID 16725)
-- Name: vendors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendors (
    vendor_id bigint NOT NULL,
    owner_name character varying(100) NOT NULL,
    vendor_name character varying(150) NOT NULL,
    phone character varying(15) NOT NULL,
    email character varying(150),
    address character varying(255),
    city character varying(100),
    latitude numeric(10,7),
    longitude numeric(10,7),
    rating numeric(2,1) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    CONSTRAINT vendors_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric))),
    CONSTRAINT vendors_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'closed'::character varying, 'inactive'::character varying])::text[])))
);


ALTER TABLE public.vendors OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16724)
-- Name: vendors_vendor_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.vendors ALTER COLUMN vendor_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.vendors_vendor_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 5158 (class 0 OID 16704)
-- Dependencies: 222
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.addresses (address_id, user_id, label, address_line, city, state, pincode, latitude, longitude, is_default) FROM stdin;
1	1	Home	Sector 15	Gurugram	Haryana	122001	28.4595000	77.0266000	t
2	2	Home	Sector 21	Noida	Uttar Pradesh	201301	28.5823000	77.3540000	t
3	3	Work	Connaught Place	New Delhi	Delhi	110001	28.6315000	77.2167000	t
4	4	Home	Sector 62	Noida	Uttar Pradesh	201309	28.6270000	77.3720000	t
5	5	Home	Rajouri Garden	New Delhi	Delhi	110027	28.6427000	77.1227000	t
\.


--
-- TOC entry 5162 (class 0 OID 16747)
-- Dependencies: 226
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (category_id, name, slug, is_active) FROM stdin;
1	Pizza	pizza	t
2	Burger	burger	t
3	Biryani	biryani	t
4	North Indian	north-indian	t
5	Desserts	desserts	t
\.


--
-- TOC entry 5166 (class 0 OID 16791)
-- Dependencies: 230
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.coupons (coupon_id, code, discount_type, discount_value, min_order_value, max_discount, valid_from, valid_to, is_active) FROM stdin;
1	WELCOME50	flat	50.00	199.00	50.00	\N	\N	t
2	SAVE20	percentage	20.00	299.00	100.00	\N	\N	t
3	FIRST100	flat	100.00	499.00	100.00	\N	\N	t
4	NEWUSER30	percentage	30.00	399.00	150.00	\N	\N	t
5	KRY10	percentage	10.00	199.00	80.00	\N	\N	t
\.


--
-- TOC entry 5176 (class 0 OID 16912)
-- Dependencies: 240
-- Data for Name: deliveries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.deliveries (delivery_id, order_id, delivery_partner_id, status, pickup_at, delivered_at, current_latitude, current_longitude) FROM stdin;
1	1	1	delivered	\N	\N	\N	\N
2	2	2	assigned	\N	\N	\N	\N
3	3	3	waiting_pickup	\N	\N	\N	\N
4	4	4	out_for_delivery	\N	\N	\N	\N
5	5	5	cancelled	\N	\N	\N	\N
\.


--
-- TOC entry 5174 (class 0 OID 16896)
-- Dependencies: 238
-- Data for Name: delivery_partners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_partners (delivery_partner_id, name, phone, vehicle_type, vehicle_number, status, latitude, longitude) FROM stdin;
1	Arjun	9000000001	Bike	HR26AA1001	available	28.4600000	77.0380000
2	Deepak	9000000002	Bike	UP16BB2002	busy	28.5705000	77.3270000
3	Manish	9000000003	Scooter	DL8SCC3003	available	28.6310000	77.2180000
4	Ravi	9000000004	Bike	UP14DD4004	busy	28.6275000	77.3710000
5	Vishal	9000000005	Bike	DL5SEE5005	offline	28.6430000	77.1210000
\.


--
-- TOC entry 5170 (class 0 OID 16855)
-- Dependencies: 234
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (order_item_id, order_id, product_id, quantity, unit_price, line_total) FROM stdin;
1	1	1	1	349.00	349.00
2	2	2	2	179.00	358.00
3	3	3	1	269.00	269.00
4	4	4	2	249.00	498.00
5	5	5	2	129.00	258.00
\.


--
-- TOC entry 5168 (class 0 OID 16809)
-- Dependencies: 232
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (order_id, user_id, vendor_id, address_id, coupon_id, subtotal, delivery_fee, discount, tax, total_amount, status, payment_status, placed_at) FROM stdin;
1	1	1	1	1	349.00	30.00	50.00	17.45	346.45	delivered	paid	2026-09-24 13:13:13.27673+05:30
2	2	2	2	2	358.00	25.00	72.00	18.55	329.55	preparing	paid	2026-09-24 13:13:13.27673+05:30
3	3	3	3	\N	269.00	20.00	0.00	13.45	302.45	confirmed	paid	2026-09-24 13:13:13.27673+05:30
4	4	4	4	4	498.00	30.00	100.00	24.90	452.90	out_for_delivery	paid	2026-09-24 13:13:13.27673+05:30
5	5	5	5	5	258.00	20.00	25.80	12.60	264.80	cancelled	refunded	2026-09-24 13:13:13.27673+05:30
\.


--
-- TOC entry 5172 (class 0 OID 16878)
-- Dependencies: 236
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (payment_id, order_id, transaction_id, provider, method, amount, status, paid_at) FROM stdin;
1	1	TXN10001	Razorpay	UPI	346.45	success	2026-09-24 13:13:13.27673+05:30
2	2	TXN10002	Razorpay	CARD	329.55	success	2026-09-24 13:13:13.27673+05:30
3	3	TXN10003	Razorpay	UPI	302.45	success	2026-09-24 13:13:13.27673+05:30
4	4	TXN10004	Razorpay	WALLET	452.90	success	2026-09-24 13:13:13.27673+05:30
5	5	TXN10005	Razorpay	UPI	264.80	refunded	2026-09-24 13:13:13.27673+05:30
\.


--
-- TOC entry 5164 (class 0 OID 16760)
-- Dependencies: 228
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (product_id, vendor_id, category_id, name, description, price, discount_price, image_url, is_veg, is_available, created_at) FROM stdin;
1	1	1	Farmhouse Pizza	Cheese pizza with vegetables	399.00	349.00	pizza.jpg	t	t	2026-09-24 13:13:13.27673+05:30
2	2	2	Classic Burger	Veg burger with cheese	199.00	179.00	burger.jpg	t	t	2026-09-24 13:13:13.27673+05:30
3	3	3	Chicken Biryani	Hyderabadi style biryani	299.00	269.00	biryani.jpg	f	t	2026-09-24 13:13:13.27673+05:30
4	4	4	Paneer Butter Masala	Creamy paneer curry	279.00	249.00	paneer.jpg	t	t	2026-09-24 13:13:13.27673+05:30
5	5	5	Chocolate Brownie	Hot chocolate brownie	149.00	129.00	brownie.jpg	t	t	2026-09-24 13:13:13.27673+05:30
\.


--
-- TOC entry 5178 (class 0 OID 16936)
-- Dependencies: 242
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reviews (review_id, user_id, vendor_id, order_id, rating, comment, created_at) FROM stdin;
1	1	1	1	5	Food was amazing	2026-09-24 13:13:13.27673+05:30
2	2	2	2	4	Good taste	2026-09-24 13:13:13.27673+05:30
3	3	3	3	5	Very tasty	2026-09-24 13:13:13.27673+05:30
4	4	4	4	4	Nice experience	2026-09-24 13:13:13.27673+05:30
5	5	5	5	3	Average experience	2026-09-24 13:13:13.27673+05:30
\.


--
-- TOC entry 5156 (class 0 OID 16679)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (user_id, full_name, email, phone, password_hash, role, status, created_at) FROM stdin;
1	Rahul Sharma	rahul@gmail.com	9876543210	hash_rahul	customer	active	2026-09-24 13:13:13.27673+05:30
2	Aman Verma	aman@gmail.com	9876543211	hash_aman	customer	active	2026-09-24 13:13:13.27673+05:30
3	Priya Singh	priya@gmail.com	9876543212	hash_priya	customer	active	2026-09-24 13:13:13.27673+05:30
4	Neha Gupta	neha@gmail.com	9876543213	hash_neha	customer	active	2026-09-24 13:13:13.27673+05:30
5	Rohit Kumar	rohit@gmail.com	9876543214	hash_rohit	customer	active	2026-09-24 13:13:13.27673+05:30
\.


--
-- TOC entry 5160 (class 0 OID 16725)
-- Dependencies: 224
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vendors (vendor_id, owner_name, vendor_name, phone, email, address, city, latitude, longitude, rating, status) FROM stdin;
1	Vikas Mehta	Food Hub	9811111111	foodhub@gmail.com	Sector 14	Gurugram	28.4590000	77.0390000	4.5	open
2	Karan Singh	Spice Villa	9811111112	spicevilla@gmail.com	Sector 18	Noida	28.5700000	77.3260000	4.3	open
3	Anjali Kapoor	Daily Fresh	9811111113	dailyfresh@gmail.com	Connaught Place	Delhi	28.6320000	77.2190000	4.6	open
4	Mohit Jain	Tasty Corner	9811111114	tastycorner@gmail.com	Sector 62	Noida	28.6280000	77.3700000	4.2	open
5	Suresh Yadav	Quick Bites	9811111115	quickbites@gmail.com	Rajouri Garden	Delhi	28.6420000	77.1200000	4.4	open
\.


--
-- TOC entry 5184 (class 0 OID 0)
-- Dependencies: 221
-- Name: addresses_address_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.addresses_address_id_seq', 5, true);


--
-- TOC entry 5185 (class 0 OID 0)
-- Dependencies: 225
-- Name: categories_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_category_id_seq', 5, true);


--
-- TOC entry 5186 (class 0 OID 0)
-- Dependencies: 229
-- Name: coupons_coupon_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.coupons_coupon_id_seq', 5, true);


--
-- TOC entry 5187 (class 0 OID 0)
-- Dependencies: 239
-- Name: deliveries_delivery_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.deliveries_delivery_id_seq', 5, true);


--
-- TOC entry 5188 (class 0 OID 0)
-- Dependencies: 237
-- Name: delivery_partners_delivery_partner_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.delivery_partners_delivery_partner_id_seq', 5, true);


--
-- TOC entry 5189 (class 0 OID 0)
-- Dependencies: 233
-- Name: order_items_order_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_order_item_id_seq', 5, true);


--
-- TOC entry 5190 (class 0 OID 0)
-- Dependencies: 231
-- Name: orders_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_order_id_seq', 5, true);


--
-- TOC entry 5191 (class 0 OID 0)
-- Dependencies: 235
-- Name: payments_payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_payment_id_seq', 5, true);


--
-- TOC entry 5192 (class 0 OID 0)
-- Dependencies: 227
-- Name: products_product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_product_id_seq', 5, true);


--
-- TOC entry 5193 (class 0 OID 0)
-- Dependencies: 241
-- Name: reviews_review_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reviews_review_id_seq', 5, true);


--
-- TOC entry 5194 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_user_id_seq', 5, true);


--
-- TOC entry 5195 (class 0 OID 0)
-- Dependencies: 223
-- Name: vendors_vendor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vendors_vendor_id_seq', 5, true);


--
-- TOC entry 4954 (class 2606 OID 16718)
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (address_id);


--
-- TOC entry 4962 (class 2606 OID 16756)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (category_id);


--
-- TOC entry 4964 (class 2606 OID 16758)
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- TOC entry 4968 (class 2606 OID 16807)
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- TOC entry 4970 (class 2606 OID 16805)
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (coupon_id);


--
-- TOC entry 4986 (class 2606 OID 16924)
-- Name: deliveries deliveries_order_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_order_id_key UNIQUE (order_id);


--
-- TOC entry 4988 (class 2606 OID 16922)
-- Name: deliveries deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_pkey PRIMARY KEY (delivery_id);


--
-- TOC entry 4980 (class 2606 OID 16908)
-- Name: delivery_partners delivery_partners_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_partners
    ADD CONSTRAINT delivery_partners_phone_key UNIQUE (phone);


--
-- TOC entry 4982 (class 2606 OID 16906)
-- Name: delivery_partners delivery_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_partners
    ADD CONSTRAINT delivery_partners_pkey PRIMARY KEY (delivery_partner_id);


--
-- TOC entry 4984 (class 2606 OID 16910)
-- Name: delivery_partners delivery_partners_vehicle_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_partners
    ADD CONSTRAINT delivery_partners_vehicle_number_key UNIQUE (vehicle_number);


--
-- TOC entry 4974 (class 2606 OID 16866)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (order_item_id);


--
-- TOC entry 4972 (class 2606 OID 16833)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (order_id);


--
-- TOC entry 4976 (class 2606 OID 16887)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- TOC entry 4978 (class 2606 OID 16889)
-- Name: payments payments_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id);


--
-- TOC entry 4966 (class 2606 OID 16779)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);


--
-- TOC entry 4990 (class 2606 OID 16952)
-- Name: reviews reviews_order_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_key UNIQUE (order_id);


--
-- TOC entry 4992 (class 2606 OID 16950)
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (review_id);


--
-- TOC entry 4948 (class 2606 OID 16700)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4950 (class 2606 OID 16702)
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- TOC entry 4952 (class 2606 OID 16698)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4956 (class 2606 OID 16745)
-- Name: vendors vendors_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_email_key UNIQUE (email);


--
-- TOC entry 4958 (class 2606 OID 16743)
-- Name: vendors vendors_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_phone_key UNIQUE (phone);


--
-- TOC entry 4960 (class 2606 OID 16741)
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (vendor_id);


--
-- TOC entry 4993 (class 2606 OID 16719)
-- Name: addresses fk_addresses_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 5003 (class 2606 OID 16925)
-- Name: deliveries fk_deliveries_order; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT fk_deliveries_order FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- TOC entry 5004 (class 2606 OID 16930)
-- Name: deliveries fk_deliveries_partner; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT fk_deliveries_partner FOREIGN KEY (delivery_partner_id) REFERENCES public.delivery_partners(delivery_partner_id) ON DELETE RESTRICT;


--
-- TOC entry 5000 (class 2606 OID 16867)
-- Name: order_items fk_order_items_order; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- TOC entry 5001 (class 2606 OID 16872)
-- Name: order_items fk_order_items_product; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- TOC entry 4996 (class 2606 OID 16844)
-- Name: orders fk_orders_address; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_address FOREIGN KEY (address_id) REFERENCES public.addresses(address_id) ON DELETE RESTRICT;


--
-- TOC entry 4997 (class 2606 OID 16849)
-- Name: orders fk_orders_coupon; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_coupon FOREIGN KEY (coupon_id) REFERENCES public.coupons(coupon_id) ON DELETE SET NULL;


--
-- TOC entry 4998 (class 2606 OID 16834)
-- Name: orders fk_orders_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;


--
-- TOC entry 4999 (class 2606 OID 16839)
-- Name: orders fk_orders_vendor; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_vendor FOREIGN KEY (vendor_id) REFERENCES public.vendors(vendor_id) ON DELETE RESTRICT;


--
-- TOC entry 5002 (class 2606 OID 16890)
-- Name: payments fk_payments_order; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- TOC entry 4994 (class 2606 OID 16785)
-- Name: products fk_products_category; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES public.categories(category_id) ON DELETE RESTRICT;


--
-- TOC entry 4995 (class 2606 OID 16780)
-- Name: products fk_products_vendor; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_vendor FOREIGN KEY (vendor_id) REFERENCES public.vendors(vendor_id) ON DELETE CASCADE;


--
-- TOC entry 5005 (class 2606 OID 16963)
-- Name: reviews fk_reviews_order; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT fk_reviews_order FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- TOC entry 5006 (class 2606 OID 16953)
-- Name: reviews fk_reviews_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 5007 (class 2606 OID 16958)
-- Name: reviews fk_reviews_vendor; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT fk_reviews_vendor FOREIGN KEY (vendor_id) REFERENCES public.vendors(vendor_id) ON DELETE CASCADE;


-- Completed on 2026-09-24 13:17:19

--
-- PostgreSQL database dump complete
--

\unrestrict 1JsbzdE9H2m5EYNUeOCjL0kJOScVdEKxsDukuDVs97cur4rnOnEgA5cM9VuQIWx

