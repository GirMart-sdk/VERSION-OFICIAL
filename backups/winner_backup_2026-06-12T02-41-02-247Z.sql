--
-- PostgreSQL database dump
--

\restrict 1cEyPxxsnoIvK7jkIfMBQsPXEvkUH2wPkgLy0SMuLdQsDQUU8JfeSHMkKbNSeoL

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

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
    last_purchase timestamp(6) without time zone,
    vip_status character varying(50) DEFAULT 'regular'::character varying,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
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
    last_updated timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.demand_forecast OWNER TO postgres;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id character varying(50) NOT NULL,
    category character varying(100),
    concept character varying(255),
    detail text,
    method character varying(50) DEFAULT 'Efectivo'::character varying,
    amount numeric(12,2) NOT NULL,
    description text,
    date date DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP
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
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
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
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
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
    product_id character varying(50),
    product_name character varying(255) NOT NULL,
    qty integer NOT NULL,
    price numeric(12,2) NOT NULL,
    size character varying(10)
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
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
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
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    username text NOT NULL,
    email text,
    password text NOT NULL,
    role text DEFAULT 'admin'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: sale_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items ALTER COLUMN id SET DEFAULT nextval('public.sale_items_id_seq'::regclass);


--
-- Name: sale_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_payments ALTER COLUMN id SET DEFAULT nextval('public.sale_payments_id_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
c460072d-4050-45e0-967b-35e9a4c065cc	f07805810f9a498886aaa99649f2a294c9a0f8dfc8bb2423195f554c74f8efa9	\N	0_init_production	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 0_init_production\n\nDatabase error code: 42601\n\nDatabase error:\nERROR: error de sintaxis en o cerca de «﻿»\n\nPosition:\n[1m  0[0m\n[1m  1[1;31m ﻿-- CreateSchema[0m\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42601), message: "error de sintaxis en o cerca de «\\u{feff}»", detail: None, hint: None, position: Some(Original(1)), where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("scan.l"), line: Some(1240), routine: Some("scanner_yyerror") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="0_init_production"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="0_init_production"\n             at schema-engine\\commands\\src\\commands\\apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:260	2026-06-11 04:17:31.548472-05	2026-06-11 04:16:21.396838-05	0
f426ce09-12b0-465d-a9e2-1e456621b556	f07805810f9a498886aaa99649f2a294c9a0f8dfc8bb2423195f554c74f8efa9	2026-06-11 04:17:31.552881-05	0_init_production		\N	2026-06-11 04:17:31.552881-05	0
\.


--
-- Data for Name: cash_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_sessions (id, opened_at, closed_at, opened_by, closed_by, initial_balance, theoretical_sales, theoretical_expenses, real_balance, difference, status, notes) FROM stdin;
\.


--
-- Data for Name: customer_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_profiles (id, email, name, phone, country, total_spent, total_orders, last_purchase, vip_status, created_at) FROM stdin;
\.


--
-- Data for Name: demand_forecast; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.demand_forecast (id, product_id, predicted_qty, confidence_score, trend, last_updated) FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, category, concept, detail, method, amount, description, date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory (product_id, size, quantity, barcode, min_stock, location, updated_at) FROM stdin;
P001	S	15	77000183	3	\N	2026-06-11 09:27:16.875
P001	M	15	77000177	3	\N	2026-06-11 09:27:16.899
P001	L	15	77000176	3	\N	2026-06-11 09:27:16.908
P001	XL	15	77000188	3	\N	2026-06-11 09:27:16.914
P002	S	15	77000283	3	\N	2026-06-11 09:27:16.933
P002	M	15	77000277	3	\N	2026-06-11 09:27:16.94
P002	L	15	77000276	3	\N	2026-06-11 09:27:16.947
P002	XL	15	77000288	3	\N	2026-06-11 09:27:16.952
P003	30	12	77000330	2	\N	2026-06-11 09:27:16.963
P003	32	12	77000332	2	\N	2026-06-11 09:27:16.968
P003	34	12	77000334	2	\N	2026-06-11 09:27:16.974
P003	36	12	77000336	2	\N	2026-06-11 09:27:16.979
P004	S	15	77000483	3	\N	2026-06-11 09:27:16.989
P004	M	15	77000477	3	\N	2026-06-11 09:27:16.994
P004	L	15	77000476	3	\N	2026-06-11 09:27:17
P004	XL	15	77000488	3	\N	2026-06-11 09:27:17.005
P026	38	5	88002638	1	\N	2026-06-11 09:27:17.016
P026	39	5	88002639	1	\N	2026-06-11 09:27:17.021
P026	40	5	88002640	1	\N	2026-06-11 09:27:17.026
P026	41	5	88002641	1	\N	2026-06-11 09:27:17.032
P026	42	5	88002642	1	\N	2026-06-11 09:27:17.038
A001	U	100	990001	5	\N	2026-06-11 09:27:17.048
A002	U	100	990002	5	\N	2026-06-11 09:27:17.057
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, sale_id, status, shipping_method, shipping_address, shipping_cost, tracking_number, customer_email, customer_phone, created_at, updated_at) FROM stdin;
ORD-SEED-001	SALE-SEED-001	ENTREGADO	Recogida local	Tienda Principal	0.00	\N	\N	\N	2026-06-11 09:27:17.07	2026-06-11 09:27:17.07
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, price, old_price, cost, category, image, badge, badge_type, sku, description, on_sale, promo_price, created_at, updated_at) FROM stdin;
P001	Camiseta Streetwear Oversize	85000.00	\N	35000.00	Camisetas Caballero	https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=500	Nuevo	\N	WIN-P001	Camiseta 100% algodón, estilo urbano premium.	f	\N	2026-06-11 09:27:16.854	2026-06-11 09:27:16.854
P002	Hoodie Crop Urbano	95000.00	\N	40000.00	Hoodies Dama	https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500	Top Ventas	\N	WIN-P002	Hoodie corto estilo industrial para mujer.	f	\N	2026-06-11 09:27:16.93	2026-06-11 09:27:16.93
P003	Jogger Cargo Premium	115000.00	\N	55000.00	Joggers Caballero	https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500	Oferta	\N	WIN-P003	Pantalón técnico con múltiples bolsillos.	f	\N	2026-06-11 09:27:16.959	2026-06-11 09:27:16.959
P004	Set Legging + Top W	130000.00	\N	65000.00	Conjuntos Dama	https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500	Nuevo	\N	WIN-P004	Conjunto deportivo de alto rendimiento.	f	\N	2026-06-11 09:27:16.986	2026-06-11 09:27:16.986
P026	Nike Air Jordan Retro	450000.00	\N	280000.00	calzado	https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500	Popular	\N	WIN-P026	Calzado icónico para coleccionistas.	f	\N	2026-06-11 09:27:17.012	2026-06-11 09:27:17.012
A001	Gorra Snapback Black	45000.00	\N	15000.00	Accesorios	https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500	\N	\N	WIN-A001	Accesorio esencial para el outfit.	f	\N	2026-06-11 09:27:17.045	2026-06-11 09:27:17.045
A002	Mochila Táctica Urbana	125000.00	\N	60000.00	Accesorios	https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500	Limitado	\N	WIN-A002	Capacidad de 20L, resistente al agua.	f	\N	2026-06-11 09:27:17.055	2026-06-11 09:27:17.055
\.


--
-- Data for Name: reorder_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reorder_rules (id, product_id, min_stock, qty_to_order, reorder_cost, enabled) FROM stdin;
\.


--
-- Data for Name: sale_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sale_items (id, sale_id, product_id, product_name, qty, price, size) FROM stdin;
1	SALE-SEED-001	P004	Set Legging + Top W	1	130000.00	M
\.


--
-- Data for Name: sale_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sale_payments (id, sale_id, "timestamp", amount, method, notes) FROM stdin;
1	SALE-SEED-001	2026-06-11 09:27:17.07	130000.00	Efectivo	Pago inicial completo (Seed)
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales (id, created_at, channel, vendor, client, method, subtotal, discount, total, payment_method, payment_status, customer_email, customer_phone, shipping_address, shipping_carrier, reference_number, payment_details, items) FROM stdin;
SALE-SEED-001	2026-06-11 09:27:17.07	\N	\N	Cliente de Prueba	\N	0.00	0.00	130000.00	Efectivo	completed	prueba@winner.com	573000000000	\N	\N	REF-SEED-001	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password, role, active, created_at) FROM stdin;
2ced7481-46de-4365-a280-056f938f40c8	admin	jmartjamil2001@gmail.com	909d05a5c6e250e0cd56a5a150f485abea314c713bfbb9942499df0abcd94627c88ce3bec74ad20e0d30bb271973bab366d496f55f9774ec4b75b8b5afef084f	admin	t	2026-06-11 09:27:16.719
\.


--
-- Name: sale_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sale_items_id_seq', 1, true);


--
-- Name: sale_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sale_payments_id_seq', 1, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: cash_sessions cash_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_sessions
    ADD CONSTRAINT cash_sessions_pkey PRIMARY KEY (id);


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
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: customer_profiles_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX customer_profiles_email_key ON public.customer_profiles USING btree (email);


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
-- Name: inventory_barcode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX inventory_barcode_key ON public.inventory USING btree (barcode);


--
-- Name: products_sku_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX products_sku_key ON public.products USING btree (sku);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


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
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict 1cEyPxxsnoIvK7jkIfMBQsPXEvkUH2wPkgLy0SMuLdQsDQUU8JfeSHMkKbNSeoL

