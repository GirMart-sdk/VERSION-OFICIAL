--
-- PostgreSQL database dump
--

\restrict aePEkukms790uX1QAB8pBHHa3UePMTNsBIi5YtqDXqQaT63XAqug6ciWcp9ipt7

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

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
-- Name: cash_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cash_sessions (
    id character varying(50) NOT NULL,
    opened_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closed_at timestamp(6) without time zone,
    opened_by character varying(100) NOT NULL,
    closed_by character varying(100),
    initial_balance numeric(12,2) DEFAULT 0 NOT NULL,
    theoretical_sales numeric(12,2) DEFAULT 0 NOT NULL,
    theoretical_expenses numeric(12,2) DEFAULT 0 NOT NULL,
    real_balance numeric(12,2),
    difference numeric(12,2),
    status character varying(20) DEFAULT 'OPEN'::character varying NOT NULL,
    notes text
);


ALTER TABLE public.cash_sessions OWNER TO postgres;

--
-- Name: customer_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_profiles (
    id character varying(50) NOT NULL,
    email character varying(255),
    name character varying(255),
    phone character varying(20),
    country character varying(50) DEFAULT 'CO'::character varying,
    total_spent numeric(12,2) DEFAULT 0,
    total_orders integer DEFAULT 0,
    last_purchase timestamp without time zone,
    vip_status character varying(50) DEFAULT 'regular'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.customer_profiles OWNER TO postgres;

--
-- Name: demand_forecast; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.demand_forecast (
    id character varying(50) NOT NULL,
    product_id character varying(50) NOT NULL,
    predicted_qty integer,
    confidence_score numeric(5,2),
    trend character varying(20),
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.demand_forecast OWNER TO postgres;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id character varying(50) NOT NULL,
    category character varying(100),
    amount numeric(12,2) NOT NULL,
    description text,
    date date DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    concept character varying(255),
    detail text,
    updated_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP,
    method character varying(50) DEFAULT 'Efectivo'::character varying
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory (
    product_id character varying(50) NOT NULL,
    size character varying(10) NOT NULL,
    quantity integer DEFAULT 0,
    barcode character varying(100),
    min_stock integer DEFAULT 2,
    location character varying(100),
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.inventory OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id character varying(50) NOT NULL,
    sale_id character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'PENDIENTE'::character varying,
    shipping_method character varying(100),
    shipping_address text,
    shipping_cost numeric(12,2) DEFAULT 0,
    tracking_number character varying(100),
    customer_email character varying(255),
    customer_phone character varying(20),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    price numeric(12,2) NOT NULL,
    old_price numeric(12,2),
    cost numeric(12,2) DEFAULT 0,
    category character varying(50),
    image text,
    badge character varying(50),
    badge_type character varying(50),
    sku character varying(100),
    description text,
    on_sale boolean DEFAULT false,
    promo_price numeric(12,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: reorder_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reorder_rules (
    id character varying(50) NOT NULL,
    product_id character varying(50) NOT NULL,
    min_stock integer NOT NULL,
    qty_to_order integer NOT NULL,
    reorder_cost numeric(12,2) DEFAULT 0,
    enabled integer DEFAULT 1
);


ALTER TABLE public.reorder_rules OWNER TO postgres;

--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sale_items (
    id integer NOT NULL,
    sale_id character varying(50) NOT NULL,
    product_name character varying(255) NOT NULL,
    qty integer NOT NULL,
    price numeric(12,2) NOT NULL,
    size character varying(10),
    product_id character varying(50)
);


ALTER TABLE public.sale_items OWNER TO postgres;

--
-- Name: sale_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sale_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sale_items_id_seq OWNER TO postgres;

--
-- Name: sale_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sale_items_id_seq OWNED BY public.sale_items.id;


--
-- Name: sale_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sale_payments (
    id integer NOT NULL,
    sale_id character varying(50) NOT NULL,
    "timestamp" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    amount numeric(12,2) NOT NULL,
    method character varying(50),
    notes text
);


ALTER TABLE public.sale_payments OWNER TO postgres;

--
-- Name: sale_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sale_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sale_payments_id_seq OWNER TO postgres;

--
-- Name: sale_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sale_payments_id_seq OWNED BY public.sale_payments.id;


--
-- Name: sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales (
    id character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    channel character varying(50),
    vendor character varying(100),
    client character varying(255),
    method character varying(50),
    subtotal numeric(12,2) DEFAULT 0,
    discount numeric(12,2) DEFAULT 0,
    total numeric(12,2) NOT NULL,
    payment_method character varying(50),
    payment_status character varying(50) DEFAULT 'completed'::character varying,
    customer_email character varying(255),
    customer_phone character varying(20),
    shipping_address text,
    shipping_carrier character varying(100),
    reference_number character varying(100),
    payment_details jsonb,
    items text
);


ALTER TABLE public.sales OWNER TO postgres;

--
-- Name: sale_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items ALTER COLUMN id SET DEFAULT nextval('public.sale_items_id_seq'::regclass);


--
-- Name: sale_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_payments ALTER COLUMN id SET DEFAULT nextval('public.sale_payments_id_seq'::regclass);


--
-- Data for Name: cash_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_sessions (id, opened_at, closed_at, opened_by, closed_by, initial_balance, theoretical_sales, theoretical_expenses, real_balance, difference, status, notes) FROM stdin;
CS-MQ7AXXFC	2026-06-09 23:59:53.211	\N	admin	\N	500000.00	0.00	0.00	\N	\N	OPEN	Apertura desde Dashboard
\.


--
-- Data for Name: customer_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_profiles (id, email, name, phone, country, total_spent, total_orders, last_purchase, vip_status, created_at) FROM stdin;
CUST-PUBLIC	mostrador@winner.store	Cliente Mostrador	\N	CO	0.00	0	\N	regular	2026-06-09 15:05:25.776098
\.


--
-- Data for Name: demand_forecast; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.demand_forecast (id, product_id, predicted_qty, confidence_score, trend, last_updated) FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, category, amount, description, date, created_at, concept, detail, updated_at, method) FROM stdin;
EXP-MQ77DE35	Marketing	50000.00	\N	2026-06-09	2026-06-09 00:00:00	DJ ANIMADOR		2026-06-09 22:19:56	Efectivo
EXP-MQ781PZB	Comida / Insumos	15000.00	\N	2026-06-09	2026-06-09 00:00:00	ALMUERZO	COMIDA ALMUERZO	2026-06-09 22:38:51	Efectivo
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory (product_id, size, quantity, barcode, min_stock, location, updated_at) FROM stdin;
P001	S	15	77000183	3	\N	2026-06-09 21:58:59.337
P001	M	15	77000177	3	\N	2026-06-09 21:58:59.361
P001	L	15	77000176	3	\N	2026-06-09 21:58:59.369
P001	XL	15	77000188	3	\N	2026-06-09 21:58:59.376
P002	XS	2	\N	2	\N	2026-06-09 22:20:51.275
P002	S	5	77000283	3	\N	2026-06-09 21:58:59.385
P002	M	5	77000277	3	\N	2026-06-09 21:58:59.392
P002	XL	5	77000288	3	\N	2026-06-09 21:58:59.404
P002	XXL	5	\N	2	\N	2026-06-09 22:20:51.295
P004	XS	10	\N	2	\N	2026-06-09 22:21:13.142
P004	M	5	77000477	3	\N	2026-06-09 21:58:59.448
P004	XL	5	77000488	3	\N	2026-06-09 21:58:59.465
P004	XXL	7	\N	2	\N	2026-06-09 22:21:13.163
P004	U	0	\N	2	\N	2026-06-09 22:21:13.166
P003	XS	10	\N	2	\N	2026-06-09 22:22:24.826
P003	S	5	77000383	3	\N	2026-06-09 21:58:59.414
P003	M	5	77000377	3	\N	2026-06-09 21:58:59.42
P003	L	5	77000376	3	\N	2026-06-09 21:58:59.425
P003	XXL	5	\N	2	\N	2026-06-09 22:22:24.85
P002	L	9	77000276	3	\N	2026-06-09 21:58:59.398
P004	L	5	77000476	3	\N	2026-06-09 21:58:59.456
A001	U	19	990001	5	\N	2026-06-09 21:58:59.513
P004	S	9	77000483	3	\N	2026-06-09 21:58:59.44
P003	XL	4	77000388	3	\N	2026-06-09 21:58:59.431
P001	U	20	\N	2	\N	2026-06-10 01:00:15.654
P002	U	10	\N	2	\N	2026-06-09 22:20:51.299
P003	U	20	\N	2	\N	2026-06-09 22:22:24.855
P004	34	5	\N	2	\N	2026-06-10 01:02:43.399
P004	35	5	\N	2	\N	2026-06-10 01:02:43.405
P004	36	5	\N	2	\N	2026-06-10 01:02:43.408
P004	37	5	\N	2	\N	2026-06-10 01:02:43.412
P004	38	5	\N	2	\N	2026-06-10 01:02:43.415
P004	39	5	\N	2	\N	2026-06-10 01:02:43.419
P004	40	0	\N	2	\N	2026-06-10 01:02:43.422
P004	41	0	\N	2	\N	2026-06-10 01:02:43.426
P004	42	0	\N	2	\N	2026-06-10 01:02:43.429
P004	43	0	\N	2	\N	2026-06-10 01:02:43.432
P004	44	0	\N	2	\N	2026-06-10 01:02:43.434
P004	45	0	\N	2	\N	2026-06-10 01:02:43.438
P004	46	0	\N	2	\N	2026-06-10 01:02:43.441
P026	34	4	\N	2	\N	2026-06-09 22:21:35.47
P026	35	5	\N	2	\N	2026-06-09 22:21:35.475
P026	36	7	\N	2	\N	2026-06-09 22:21:35.479
P026	37	3	\N	2	\N	2026-06-09 22:21:35.482
P026	38	8	88002638	1	\N	2026-06-09 21:58:59.478
P026	39	0	88002639	1	\N	2026-06-09 21:58:59.485
P026	40	0	88002640	1	\N	2026-06-09 21:58:59.491
P026	41	0	88002641	1	\N	2026-06-09 21:58:59.498
P026	42	0	88002642	1	\N	2026-06-09 21:58:59.504
P026	43	0	\N	2	\N	2026-06-09 22:21:35.504
P026	44	0	\N	2	\N	2026-06-09 22:21:35.507
P026	45	0	\N	2	\N	2026-06-09 22:21:35.511
P026	46	0	\N	2	\N	2026-06-09 22:21:35.514
A001	34	5	\N	2	\N	2026-06-10 01:04:27.225
A001	35	5	\N	2	\N	2026-06-10 01:04:27.232
A001	36	5	\N	2	\N	2026-06-10 01:04:27.237
A001	37	5	\N	2	\N	2026-06-10 01:04:27.243
A001	38	5	\N	2	\N	2026-06-10 01:04:27.248
A001	39	5	\N	2	\N	2026-06-10 01:04:27.252
A001	40	0	\N	2	\N	2026-06-10 01:04:27.256
A001	41	0	\N	2	\N	2026-06-10 01:04:27.26
A001	42	0	\N	2	\N	2026-06-10 01:04:27.264
A001	43	0	\N	2	\N	2026-06-10 01:04:27.268
A001	44	0	\N	2	\N	2026-06-10 01:04:27.272
A001	45	0	\N	2	\N	2026-06-10 01:04:27.275
A001	46	0	\N	2	\N	2026-06-10 01:04:27.279
A002	U	19	990002	5	\N	2026-06-09 21:58:59.522
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, sale_id, status, shipping_method, shipping_address, shipping_cost, tracking_number, customer_email, customer_phone, created_at, updated_at) FROM stdin;
ORD-SEED-001	SALE-SEED-001	ENTREGADO	Recogida local	Tienda Principal	0.00	\N	\N	\N	2026-06-09 22:09:51.097	2026-06-09 22:09:51.097
ORD-07e779de	ONMQ77R8A9	ENTREGADO	Servientrega	Calle 2	0.00	77R8A9	\N	\N	2026-06-09 22:30:42.115	2026-06-09 22:30:42.115
ORD-342766eb	mq77xzm9cxq	PENDIENTE	Físico	Venta Directa	0.00		\N	\N	2026-06-09 22:35:57.457	2026-06-09 22:35:57.457
ORD-9f2f9003	mq7azf34gis	PENDIENTE	Físico	Venta Directa	0.00		\N	\N	2026-06-10 00:01:03.22	2026-06-10 00:01:03.22
ORD-9c68aad6	mq7csk6o6he	PENDIENTE	Físico	Venta Directa	0.00		\N	\N	2026-06-10 00:51:42.334	2026-06-10 00:51:42.334
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, price, old_price, cost, category, image, badge, badge_type, sku, description, on_sale, promo_price, created_at, updated_at) FROM stdin;
P001	gorra	85000.00	\N	35000.00	accesorios	http://192.168.1.8:3000/uploads/1781053196265-12f25cb8-c48c-4246-8b93-e4685bd731c2.webp	Nuevo	\N	WIN-P001	Camiseta 100% algodón, estilo urbano premium.	f	\N	2026-06-09 21:58:59.066	2026-06-09 21:58:59.066
P002	bolso de mano	95000.00	\N	40000.00	accesorios	http://192.168.1.8:3000/uploads/1781053228204-15ef1e04-705b-48b6-8f34-4a71e3edabfd.webp	Top Ventas	\N	WIN-P002	Hoodie corto estilo industrial para mujer.	f	\N	2026-06-09 21:58:59.382	2026-06-09 21:58:59.382
P003	Bolso de mano premium	115000.00	\N	55000.00	accesorios	http://192.168.1.8:3000/uploads/1781053270204-6.05.33_pm.webp	Oferta	\N	WIN-P003	Pantalón técnico con múltiples bolsillos.	f	\N	2026-06-09 21:58:59.411	2026-06-09 21:58:59.411
P004	zapatillas sckecher dama	130000.00	\N	65000.00	calzado	http://192.168.1.8:3000/uploads/1781053314564-0d4ad2cd-6ee5-486e-b854-f6c4620c3a29.webp	Nuevo	\N	WIN-P004	Conjunto deportivo de alto rendimiento.	f	\N	2026-06-09 21:58:59.437	2026-06-09 21:58:59.437
P026	let coq dama	450000.00	\N	280000.00	calzado	http://192.168.1.8:3000/uploads/1781053377106-70c5c067-e206-4ff5-b5f3-3c35c87911e9.webp	Popular	\N	WIN-P026	Calzado icónico para coleccionistas.	f	\N	2026-06-09 21:58:59.475	2026-06-09 21:58:59.475
A001	zapatillas reebook dama	75000.00	\N	15000.00	calzado	http://192.168.1.8:3000/uploads/1781053423053-0ac8c617-ca7f-4773-8ead-5ebce9349466.webp	\N	\N	WIN-A001	Accesorio esencial para el outfit.	f	\N	2026-06-09 21:58:59.51	2026-06-09 21:58:59.51
A002	Mochila Táctica Urbana	85000.00	\N	60000.00	accesorios	http://192.168.1.8:3000/uploads/1781053484415-5307a138-3333-495c-81d2-8da19a637f25.webp	Limitado	\N	WIN-A002	Capacidad de 20L, resistente al agua.	f	\N	2026-06-09 21:58:59.518	2026-06-09 21:58:59.518
\.


--
-- Data for Name: reorder_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reorder_rules (id, product_id, min_stock, qty_to_order, reorder_cost, enabled) FROM stdin;
\.


--
-- Data for Name: sale_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sale_items (id, sale_id, product_name, qty, price, size, product_id) FROM stdin;
1	SALE-SEED-001	Set Legging + Top W	1	130000.00	M	P004
2	ONMQ77R8A9	Hoodie Crop Urbano	1	95000.00	L	P002
3	ONMQ77R8A9	Set Legging + Top W	1	130000.00	L	P004
4	mq77xzm9cxq	Gorra Snapback Black	1	45000.00	U	A001
5	mq77xzm9cxq	Set Legging + Top W	1	130000.00	S	P004
6	mq7azf34gis	Mochila Táctica Urbana	1	125000.00	U	A002
7	mq7csk6o6he	Jogger Cargo Premium	1	115000.00	XL	P003
\.


--
-- Data for Name: sale_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sale_payments (id, sale_id, "timestamp", amount, method, notes) FROM stdin;
1	SALE-SEED-001	2026-06-09 22:09:51.097	130000.00	Efectivo	Pago inicial completo (Seed)
2	ONMQ77R8A9	2026-06-09 22:34:22.066	225000.00	WOMPI_CARD	Cierre automático por entrega del producto
3	mq77xzm9cxq	2026-06-09 22:35:57.457	175000.00	Efectivo	Pago inicial completo (Venta Directa)
4	mq7azf34gis	2026-06-10 00:01:03.22	125000.00	Efectivo	Pago inicial completo (Venta Directa)
5	mq7csk6o6he	2026-06-10 00:51:42.334	115000.00	Efectivo	Pago inicial completo (Venta Directa)
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales (id, created_at, channel, vendor, client, method, subtotal, discount, total, payment_method, payment_status, customer_email, customer_phone, shipping_address, shipping_carrier, reference_number, payment_details, items) FROM stdin;
SALE-SEED-001	2026-06-09 22:09:51.097	\N	\N	Cliente de Prueba	\N	0.00	0.00	130000.00	Efectivo	completed	prueba@winner.com	573000000000	\N	\N	REF-SEED-001	\N	\N
ONMQ77R8A9	2026-06-09 22:30:42.115	\N	\N	Jamilton Giron	\N	0.00	0.00	225000.00	WOMPI_CARD	completed	jmartxm2023@gmail.com	+573135642283	Calle 2	\N	ONMQ77R8A9	\N	\N
mq77xzm9cxq	2026-06-09 22:35:57.457	\N	\N	Andres	\N	0.00	0.00	175000.00	Efectivo	completed	jmartxm23@gmail.com	\N	Venta Directa	\N	mq77xzm9cxq	\N	\N
mq7azf34gis	2026-06-10 00:01:03.22	\N	\N	ANDRES	\N	0.00	0.00	125000.00	Efectivo	completed	jmartxm23@gmail.com	\N	Venta Directa	\N	mq7azf34gis	\N	\N
mq7csk6o6he	2026-06-10 00:51:42.334	\N	\N	MAURICIO	\N	0.00	0.00	115000.00	Efectivo	completed	jmartxm23@gmail.com	\N	Venta Directa	\N	mq7csk6o6he	\N	\N
\.


--
-- Name: sale_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sale_items_id_seq', 7, true);


--
-- Name: sale_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sale_payments_id_seq', 5, true);


--
-- Name: cash_sessions cash_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_sessions
    ADD CONSTRAINT cash_sessions_pkey PRIMARY KEY (id);


--
-- Name: customer_profiles customer_profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_email_key UNIQUE (email);


--
-- Name: customer_profiles customer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_pkey PRIMARY KEY (id);


--
-- Name: demand_forecast demand_forecast_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demand_forecast
    ADD CONSTRAINT demand_forecast_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_barcode_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_barcode_key UNIQUE (barcode);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (product_id, size);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: reorder_rules reorder_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reorder_rules
    ADD CONSTRAINT reorder_rules_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sale_payments sale_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT sale_payments_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: idx_customer_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_email ON public.customer_profiles USING btree (email);


--
-- Name: idx_inventory_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_product ON public.inventory USING btree (product_id);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category ON public.products USING btree (category);


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_sku ON public.products USING btree (sku);


--
-- Name: idx_sales_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_timestamp ON public.sales USING btree (created_at);


--
-- Name: demand_forecast demand_forecast_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demand_forecast
    ADD CONSTRAINT demand_forecast_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: inventory inventory_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: orders orders_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: reorder_rules reorder_rules_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reorder_rules
    ADD CONSTRAINT reorder_rules_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: sale_items sale_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: sale_items sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sale_payments sale_payments_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT sale_payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict aePEkukms790uX1QAB8pBHHa3UePMTNsBIi5YtqDXqQaT63XAqug6ciWcp9ipt7

