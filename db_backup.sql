--
-- PostgreSQL database dump
--

\restrict 2BrsSS2GxmCWzRc057na7pYTVRFRUubnt6Pdyc0HhGhYR9cy1loyMyIN2yFsGR5

-- Dumped from database version 15.16
-- Dumped by pg_dump version 15.16

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.passengers DROP CONSTRAINT IF EXISTS passengers_registration_id_fkey;
ALTER TABLE IF EXISTS ONLY public.passenger_verifications DROP CONSTRAINT IF EXISTS passenger_verifications_passenger_id_fkey;
DROP INDEX IF EXISTS public.passengers_registration_slot_uidx;
DROP INDEX IF EXISTS public.passenger_verifications_passenger_idx;
ALTER TABLE IF EXISTS ONLY public.sync_runs DROP CONSTRAINT IF EXISTS sync_runs_pkey;
ALTER TABLE IF EXISTS ONLY public.registrations DROP CONSTRAINT IF EXISTS registrations_pkey;
ALTER TABLE IF EXISTS ONLY public.registrants DROP CONSTRAINT IF EXISTS registrants_pkey;
ALTER TABLE IF EXISTS ONLY public.passengers DROP CONSTRAINT IF EXISTS passengers_pkey;
ALTER TABLE IF EXISTS ONLY public.passenger_verifications DROP CONSTRAINT IF EXISTS passenger_verifications_pkey;
ALTER TABLE IF EXISTS ONLY public.app_users DROP CONSTRAINT IF EXISTS app_users_pkey;
ALTER TABLE IF EXISTS ONLY public.app_users DROP CONSTRAINT IF EXISTS app_users_email_key;
ALTER TABLE IF EXISTS ONLY public.admin_change_logs DROP CONSTRAINT IF EXISTS admin_change_logs_pkey;
ALTER TABLE IF EXISTS public.sync_runs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.passengers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.passenger_verifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.app_users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.admin_change_logs ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.sync_runs_id_seq;
DROP TABLE IF EXISTS public.sync_runs;
DROP TABLE IF EXISTS public.registrations;
DROP TABLE IF EXISTS public.registrants;
DROP SEQUENCE IF EXISTS public.passengers_id_seq;
DROP TABLE IF EXISTS public.passengers;
DROP SEQUENCE IF EXISTS public.passenger_verifications_id_seq;
DROP TABLE IF EXISTS public.passenger_verifications;
DROP SEQUENCE IF EXISTS public.app_users_id_seq;
DROP TABLE IF EXISTS public.app_users;
DROP SEQUENCE IF EXISTS public.admin_change_logs_id_seq;
DROP TABLE IF EXISTS public.admin_change_logs;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_change_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_change_logs (
    id bigint NOT NULL,
    entity_type character varying(30) NOT NULL,
    entity_id character varying(100) NOT NULL,
    field_name character varying(50) NOT NULL,
    action character varying(30) NOT NULL,
    old_value text,
    new_value text,
    actor character varying(100) DEFAULT 'Admin Dashboard'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.admin_change_logs OWNER TO postgres;

--
-- Name: admin_change_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_change_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.admin_change_logs_id_seq OWNER TO postgres;

--
-- Name: admin_change_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_change_logs_id_seq OWNED BY public.admin_change_logs.id;


--
-- Name: app_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_users (
    id integer NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'operator'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT app_users_role_check CHECK ((role = ANY (ARRAY['operator'::text, 'admin'::text, 'superadmin'::text])))
);


ALTER TABLE public.app_users OWNER TO postgres;

--
-- Name: app_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.app_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.app_users_id_seq OWNER TO postgres;

--
-- Name: app_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.app_users_id_seq OWNED BY public.app_users.id;


--
-- Name: passenger_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.passenger_verifications (
    id bigint NOT NULL,
    passenger_id integer NOT NULL,
    verified_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    verified_by character varying(100) DEFAULT 'Unknown'::character varying NOT NULL,
    source character varying(20) DEFAULT 'scanner'::character varying NOT NULL,
    action character varying(20) DEFAULT 'verify'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.passenger_verifications OWNER TO postgres;

--
-- Name: passenger_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.passenger_verifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.passenger_verifications_id_seq OWNER TO postgres;

--
-- Name: passenger_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.passenger_verifications_id_seq OWNED BY public.passenger_verifications.id;


--
-- Name: passengers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.passengers (
    id integer NOT NULL,
    registration_id character varying(50),
    nama character varying(255) NOT NULL,
    is_registrant boolean DEFAULT false,
    nik character varying(50),
    ktp_url text,
    verified boolean DEFAULT false,
    verified_at timestamp without time zone,
    verified_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    source_slot smallint,
    nama_raw character varying(255),
    nama_normalized character varying(255),
    active boolean DEFAULT true,
    last_seen_at timestamp without time zone
);


ALTER TABLE public.passengers OWNER TO postgres;

--
-- Name: passengers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.passengers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.passengers_id_seq OWNER TO postgres;

--
-- Name: passengers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.passengers_id_seq OWNED BY public.passengers.id;


--
-- Name: registrants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.registrants (
    id character varying(50) NOT NULL,
    nama character varying(255) NOT NULL,
    phone character varying(50),
    ktp_url text,
    verified boolean DEFAULT false,
    verified_at timestamp without time zone,
    verified_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.registrants OWNER TO postgres;

--
-- Name: registrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.registrations (
    id character varying(50) NOT NULL,
    phone character varying(50),
    ktp_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_card_url text,
    phone_raw character varying(100),
    active boolean DEFAULT true,
    last_seen_at timestamp without time zone,
    jurusan text,
    kota_tujuan text,
    kelompok_bis text,
    bis text,
    jumlah_orang integer,
    kapasitas_bis integer
);


ALTER TABLE public.registrations OWNER TO postgres;

--
-- Name: sync_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sync_runs (
    id bigint NOT NULL,
    started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finished_at timestamp without time zone,
    status character varying(20) NOT NULL,
    rows_read integer DEFAULT 0 NOT NULL,
    rows_upserted integer DEFAULT 0 NOT NULL,
    rows_skipped integer DEFAULT 0 NOT NULL,
    error text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.sync_runs OWNER TO postgres;

--
-- Name: sync_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sync_runs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sync_runs_id_seq OWNER TO postgres;

--
-- Name: sync_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sync_runs_id_seq OWNED BY public.sync_runs.id;


--
-- Name: admin_change_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_change_logs ALTER COLUMN id SET DEFAULT nextval('public.admin_change_logs_id_seq'::regclass);


--
-- Name: app_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_users ALTER COLUMN id SET DEFAULT nextval('public.app_users_id_seq'::regclass);


--
-- Name: passenger_verifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.passenger_verifications ALTER COLUMN id SET DEFAULT nextval('public.passenger_verifications_id_seq'::regclass);


--
-- Name: passengers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.passengers ALTER COLUMN id SET DEFAULT nextval('public.passengers_id_seq'::regclass);


--
-- Name: sync_runs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_runs ALTER COLUMN id SET DEFAULT nextval('public.sync_runs_id_seq'::regclass);


--
-- Data for Name: admin_change_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_change_logs (id, entity_type, entity_id, field_name, action, old_value, new_value, actor, notes, created_at) FROM stdin;
\.


--
-- Data for Name: app_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_users (id, email, role, active, created_at) FROM stdin;
1	sakitmas010@gmail.com	operator	t	2026-03-10 08:11:23.701209+00
2	anatasyadea32@gmail.com	operator	t	2026-03-10 08:11:23.717543+00
3	tropicans@gmail.com	superadmin	t	2026-03-10 08:11:23.726497+00
4	yudhiar@gmail.com	admin	t	2026-03-11 03:18:54.481316+00
\.


--
-- Data for Name: passenger_verifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.passenger_verifications (id, passenger_id, verified_at, verified_by, source, action, notes, created_at) FROM stdin;
1	4427	2026-03-09 04:17:49.770629	Unknown	scanner	verify	\N	2026-03-09 04:17:49.770629
2	4826	2026-03-09 04:17:49.770629	Unknown	scanner	verify	\N	2026-03-09 04:17:49.770629
3	4427	2026-03-09 04:17:52.426536	Unknown	admin	unverify	Undo cepat dari scanner	2026-03-09 04:17:52.426536
4	4826	2026-03-09 04:17:52.426536	Unknown	admin	unverify	Undo cepat dari scanner	2026-03-09 04:17:52.426536
5	4253	2026-03-09 04:18:17.408859	Unknown	scanner	verify	\N	2026-03-09 04:18:17.408859
6	4253	2026-03-09 04:18:19.220728	Unknown	admin	unverify	Undo cepat dari scanner	2026-03-09 04:18:19.220728
7	4229	2026-03-09 06:17:22.885903	Yudhi Ardinal	scanner	verify	\N	2026-03-09 06:17:22.885903
8	4452	2026-03-09 06:17:22.885903	Yudhi Ardinal	scanner	verify	\N	2026-03-09 06:17:22.885903
9	4229	2026-03-09 06:17:30.262969	Yudhi Ardinal	admin	unverify	Undo cepat dari scanner	2026-03-09 06:17:30.262969
10	4452	2026-03-09 06:17:30.262969	Yudhi Ardinal	admin	unverify	Undo cepat dari scanner	2026-03-09 06:17:30.262969
11	4961	2026-03-09 06:31:11.148821	Yudhi Ardinal	scanner	verify	\N	2026-03-09 06:31:11.148821
12	4962	2026-03-09 06:31:11.148821	Yudhi Ardinal	scanner	verify	\N	2026-03-09 06:31:11.148821
13	4963	2026-03-09 06:31:11.148821	Yudhi Ardinal	scanner	verify	\N	2026-03-09 06:31:11.148821
14	4961	2026-03-09 06:31:14.403432	Yudhi Ardinal	admin	unverify	Undo cepat dari scanner	2026-03-09 06:31:14.403432
15	4962	2026-03-09 06:31:14.403432	Yudhi Ardinal	admin	unverify	Undo cepat dari scanner	2026-03-09 06:31:14.403432
16	4963	2026-03-09 06:31:14.403432	Yudhi Ardinal	admin	unverify	Undo cepat dari scanner	2026-03-09 06:31:14.403432
17	4365	2026-03-10 04:37:37.996103	Unknown	scanner	verify	\N	2026-03-10 04:37:37.996103
18	4574	2026-03-10 04:37:37.996103	Unknown	scanner	verify	\N	2026-03-10 04:37:37.996103
19	4961	2026-03-10 04:37:37.996103	Unknown	scanner	verify	\N	2026-03-10 04:37:37.996103
20	4365	2026-03-10 04:37:40.953424	Unknown	admin	unverify	Undo cepat dari scanner	2026-03-10 04:37:40.953424
21	4574	2026-03-10 04:37:40.953424	Unknown	admin	unverify	Undo cepat dari scanner	2026-03-10 04:37:40.953424
22	4961	2026-03-10 04:37:40.953424	Unknown	admin	unverify	Undo cepat dari scanner	2026-03-10 04:37:40.953424
23	4862	2026-03-10 06:36:16.803582	Unknown	scanner	verify	\N	2026-03-10 06:36:16.803582
24	4863	2026-03-10 06:36:16.803582	Unknown	scanner	verify	\N	2026-03-10 06:36:16.803582
25	4864	2026-03-10 06:36:16.803582	Unknown	scanner	verify	\N	2026-03-10 06:36:16.803582
26	4865	2026-03-10 06:36:16.803582	Unknown	scanner	verify	\N	2026-03-10 06:36:16.803582
27	4862	2026-03-10 06:36:30.38785	Unknown	admin	unverify	Undo cepat dari scanner	2026-03-10 06:36:30.38785
28	4863	2026-03-10 06:36:30.38785	Unknown	admin	unverify	Undo cepat dari scanner	2026-03-10 06:36:30.38785
29	4864	2026-03-10 06:36:30.38785	Unknown	admin	unverify	Undo cepat dari scanner	2026-03-10 06:36:30.38785
30	4865	2026-03-10 06:36:30.38785	Unknown	admin	unverify	Undo cepat dari scanner	2026-03-10 06:36:30.38785
31	4862	2026-03-10 06:36:44.265405	Unknown	scanner	verify	\N	2026-03-10 06:36:44.265405
32	4863	2026-03-10 06:36:44.265405	Unknown	scanner	verify	\N	2026-03-10 06:36:44.265405
33	4864	2026-03-10 06:36:44.265405	Unknown	scanner	verify	\N	2026-03-10 06:36:44.265405
34	4865	2026-03-10 06:36:44.265405	Unknown	scanner	verify	\N	2026-03-10 06:36:44.265405
\.


--
-- Data for Name: passengers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.passengers (id, registration_id, nama, is_registrant, nik, ktp_url, verified, verified_at, verified_by, created_at, source_slot, nama_raw, nama_normalized, active, last_seen_at) FROM stdin;
4230	YKSN001	Jumiati	f	3328044405790009	/uploads/YKSN001_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Jumiati	Jumiati	t	2026-03-09 01:01:20.509308
4231	YKSN001	Purwanto	f	3175040810810005	/uploads/YKSN001_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Purwanto	Purwanto	t	2026-03-09 01:01:20.509308
4232	YKSN001	Bisma Restu Maulana	f	3328040512170002	/uploads/YKSN001_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Bisma Restu Maulana	Bisma Restu Maulana	t	2026-03-09 01:01:20.509308
4233	YKSN002	Achmad Siswoyo	t	3674040107940058	/uploads/YKSN002_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Achmad Siswoyo	Achmad Siswoyo	t	2026-03-09 01:01:20.509308
4234	YKSN002	Kalimi	f	3674040508680010	/uploads/YKSN002_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Kalimi	Kalimi	t	2026-03-09 01:01:20.509308
4235	YKSN002	Yarkasih	f	3674044101750023	/uploads/YKSN002_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Yarkasih	Yarkasih	t	2026-03-09 01:01:20.509308
4236	YKSN002	Adilah Himatul Ulya	f	3674045209041001	/uploads/YKSN002_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Adilah himatul ulya	Adilah Himatul Ulya	t	2026-03-09 01:01:20.509308
4237	YKSN003	Koluki Rio Saputra	t	3328050903970003	/uploads/YKSN003_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Koluki rio saputra	Koluki Rio Saputra	t	2026-03-09 01:01:20.509308
4239	YKSN005	Widodo	t	3326101508750003	/uploads/YKSN005_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	WIDODO	Widodo	t	2026-03-09 01:01:20.509308
4463	YKSN096	Ibrahim Dwi Andaru	f	3273131503220001	/uploads/YKSN096_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Ibrahim Dwi Andaru	Ibrahim Dwi Andaru	t	2026-03-09 01:01:20.509308
4541	YKSN121	Didik Wijaya	f	3501012612920001	/uploads/YKSN121_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Didik wijaya	Didik Wijaya	t	2026-03-09 01:01:20.509308
3935	YKSN001	Bangkit Permana Putra	t	3321112702940001	/uploads/YKSN001_pass_1.jpg	f	\N	\N	2026-03-09 00:37:16.422903	\N	\N	\N	f	\N
3936	YKSN001	Nur Hidayah	f	3375014705970005	/uploads/YKSN001_pass_2.jpg	f	\N	\N	2026-03-09 00:37:18.066309	\N	\N	\N	f	\N
3937	YKSN001	Muhammad Nur Arrasya Adnan Permana	f	3275060208220002	/uploads/YKSN001_pass_3.jpg	f	\N	\N	2026-03-09 00:37:19.515677	\N	\N	\N	f	\N
3938	YKSN002	Bambang Sukirno	f	3321141507780002	/uploads/YKSN002_pass_1.jpg	f	\N	\N	2026-03-09 00:37:24.651256	\N	\N	\N	f	\N
3939	YKSN002	Komariyah	t	3321144708820001	/uploads/YKSN002_pass_2.jpg	f	\N	\N	2026-03-09 00:37:26.107807	\N	\N	\N	f	\N
3940	YKSN002	Andika Gusti Restu Putra	f	3321141001040001	/uploads/YKSN002_pass_3.jpg	f	\N	\N	2026-03-09 00:37:28.010398	\N	\N	\N	f	\N
3941	YKSN002	Muhammad Farid Attalah	f	3174050408160001	/uploads/YKSN002_pass_4.jpg	f	\N	\N	2026-03-09 00:37:29.587953	\N	\N	\N	f	\N
3942	YKSN003	AGUNG SETYAWAN	t	3315182003950002	/uploads/YKSN003_pass_1.jpg	f	\N	\N	2026-03-09 00:37:34.320415	\N	\N	\N	f	\N
3943	YKSN003	IRA SETIA NINGSIH	f	3175065006010015	/uploads/YKSN003_pass_2.jpg	f	\N	\N	2026-03-09 00:37:35.672846	\N	\N	\N	f	\N
3944	YKSN003	WAHYU CANDRA ULHAQ	f	3315181712980003	/uploads/YKSN003_pass_3.jpg	f	\N	\N	2026-03-09 00:37:37.011596	\N	\N	\N	f	\N
3945	YKSN004	Muh fazikin	t	3324190402870001	/uploads/YKSN004_pass_1.jpg	f	\N	\N	2026-03-09 00:37:41.631373	\N	\N	\N	f	\N
3946	YKSN004	Zulaechah	f	3324165706880001	/uploads/YKSN004_pass_2.jpg	f	\N	\N	2026-03-09 00:37:43.046971	\N	\N	\N	f	\N
3947	YKSN004	Arya guna pratama	f	3324192209140001	/uploads/YKSN004_pass_3.jpg	f	\N	\N	2026-03-09 00:37:44.466417	\N	\N	\N	f	\N
3948	YKSN004	Auliya lhoirunnisa	f	3324196906190003	/uploads/YKSN004_pass_4.jpg	f	\N	\N	2026-03-09 00:37:46.047783	\N	\N	\N	f	\N
4238	YKSN004	Muhammad Ikhrom Aljabar	t	3201060910720006		f	\N	\N	2026-03-09 01:01:20.509308	1	Muhammad Ikhrom aljabar	Muhammad Ikhrom Aljabar	t	2026-03-09 01:01:20.509308
3949	YKSN005	bambang tri sugiarto	t	3324140305900001	/uploads/YKSN005_pass_1.jpg	f	\N	\N	2026-03-09 00:37:51.669621	\N	\N	\N	f	\N
3950	YKSN006	SILFIA PUTRI SARI	t	3319075803000003	/uploads/YKSN006_pass_1.jpg	f	\N	\N	2026-03-09 00:37:56.494203	\N	\N	\N	f	\N
3951	YKSN007	danni prasetyo	t	3320160911980002	/uploads/YKSN007_pass_1.jpg	f	\N	\N	2026-03-09 00:38:01.741676	\N	\N	\N	f	\N
4229	YKSN001	Retno Julianti Solikhatin	f	3328046507020011	/uploads/YKSN001_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Retno Julianti Solikhatin	Retno Julianti Solikhatin	t	2026-03-09 01:01:20.509308
4580	YKSN303	Sartini	f	3312034812760002	/uploads/YKSN303_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Sartini	Sartini	t	2026-03-09 01:01:20.509308
3952	YKSN008	Fajar adi saputra	t	3319032010970003	/uploads/YKSN008_pass_1.jpg	f	\N	\N	2026-03-09 00:38:06.504379	\N	\N	\N	f	\N
3953	YKSN008	Valen tino febrian	f	3319030602070001		f	\N	\N	2026-03-09 00:38:06.507002	\N	\N	\N	f	\N
3954	YKSN009	Topik hedi irawan	t	3403092510870003	/uploads/YKSN009_pass_1.jpg	f	\N	\N	2026-03-09 00:38:11.080043	\N	\N	\N	f	\N
3955	YKSN009	Tri astutik	f	3315145603900002	/uploads/YKSN009_pass_2.jpg	f	\N	\N	2026-03-09 00:38:12.726826	\N	\N	\N	f	\N
3956	YKSN009	Anidya nisa ardani	f	3173056408170004	/uploads/YKSN009_pass_3.jpg	f	\N	\N	2026-03-09 00:38:14.373907	\N	\N	\N	f	\N
3957	YKSN010	RIDWAN	t	3522121005970003	/uploads/YKSN010_pass_1.jpg	f	\N	\N	2026-03-09 00:38:18.977673	\N	\N	\N	f	\N
3958	YKSN010	Nurul Aini	f	3522165701000001	/uploads/YKSN010_pass_2.jpg	f	\N	\N	2026-03-09 00:38:20.405274	\N	\N	\N	f	\N
3959	YKSN010	Muhammad Rayyan Adhiyatama	f	3522282306230001	/uploads/YKSN010_pass_3.jpg	f	\N	\N	2026-03-09 00:38:21.762265	\N	\N	\N	f	\N
3960	YKSN011	Ahmad shofi	t	3318160606870006	/uploads/YKSN011_pass_1.jpg	f	\N	\N	2026-03-09 00:38:26.576963	\N	\N	\N	f	\N
3961	YKSN012	Ahmad Ainun Niam	t	3318201512950010	/uploads/YKSN012_pass_1.jpg	f	\N	\N	2026-03-09 00:38:31.2667	\N	\N	\N	f	\N
3962	YKSN012	Rifqi Rahmawati	f	3318204505990004	/uploads/YKSN012_pass_2.jpg	f	\N	\N	2026-03-09 00:38:32.737979	\N	\N	\N	f	\N
3963	YKSN013	Muhamad taufiq basori	t	3315122509900001	/uploads/YKSN013_pass_1.jpg	f	\N	\N	2026-03-09 00:38:37.691664	\N	\N	\N	f	\N
3964	YKSN013	Rizka aprilia a	f	3315146504940002	/uploads/YKSN013_pass_2.jpg	f	\N	\N	2026-03-09 00:38:39.238046	\N	\N	\N	f	\N
4241	YKSN007	Kurniawan	t	3327091002910009	/uploads/YKSN007_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Kurniawan	Kurniawan	t	2026-03-09 01:01:20.509308
4242	YKSN008	Musjayanah	f	3326106908790002	/uploads/YKSN008_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Musjayanah	Musjayanah	t	2026-03-09 01:01:20.509308
4243	YKSN009	Bambang Tri Sugiarto	t	3324140305900001	/uploads/YKSN009_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	bambang tri sugiarto	Bambang Tri Sugiarto	t	2026-03-09 01:01:20.509308
4244	YKSN010	Muhammad Fathur Rozak	t	3308191211970003	/uploads/YKSN010_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Muhammad fathur rozak	Muhammad Fathur Rozak	t	2026-03-09 01:01:20.509308
4245	YKSN011	Devani Anggi Selvianti	t	3173076706920004	/uploads/YKSN011_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	DEVANI ANGGI SELVIANTI	Devani Anggi Selvianti	t	2026-03-09 01:01:20.509308
4246	YKSN011	Harrismon Diaz	f	3173071103820012	/uploads/YKSN011_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	HARRISMON DIAZ	Harrismon Diaz	t	2026-03-09 01:01:20.509308
4247	YKSN011	Afifah Millatina Diaz	f	3173077108131004	/uploads/YKSN011_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	AFIFAH MILLATINA DIAZ	Afifah Millatina Diaz	t	2026-03-09 01:01:20.509308
4248	YKSN011	Ken Althafarizki Diaz	f	3173071607190003	/uploads/YKSN011_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Ken Althafarizki Diaz	Ken Althafarizki Diaz	t	2026-03-09 01:01:20.509308
4249	YKSN012	Yulianto	f	3671111707790006	/uploads/YKSN012_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	YULIANTO	Yulianto	t	2026-03-09 01:01:20.509308
4250	YKSN012	Siti Mardiyah	f	3671115107800008	/uploads/YKSN012_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	SITI MARDIYAH	Siti Mardiyah	t	2026-03-09 01:01:20.509308
4251	YKSN012	Aliya Maurisa Putri	f	3671115506110002	/uploads/YKSN012_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	ALIYA MAURISA PUTRI	Aliya Maurisa Putri	t	2026-03-09 01:01:20.509308
4252	YKSN012	Azema Kiana Putri	f	3671116401150001	/uploads/YKSN012_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	AZEMA KIANA PUTRI	Azema Kiana Putri	t	2026-03-09 01:01:20.509308
4253	YKSN013	Bangkit Permana Putra	t	3321112702940001	/uploads/YKSN013_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Bangkit Permana Putra	Bangkit Permana Putra	t	2026-03-09 01:01:20.509308
4254	YKSN013	Nur Hidayah	f	3375014705970005	/uploads/YKSN013_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Nur Hidayah	Nur Hidayah	t	2026-03-09 01:01:20.509308
4255	YKSN013	Muhammad Nur Arrasya Adnan Permana	f	3275060208220002	/uploads/YKSN013_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Muhammad Nur Arrasya Adnan Permana	Muhammad Nur Arrasya Adnan Permana	t	2026-03-09 01:01:20.509308
4256	YKSN014	Silfia Putri Sari	t	3319075803000003	/uploads/YKSN014_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	SILFIA PUTRI SARI	Silfia Putri Sari	t	2026-03-09 01:01:20.509308
4257	YKSN015	Topik Hedi Irawan	t	3403092510870003	/uploads/YKSN015_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Topik hedi irawan	Topik Hedi Irawan	t	2026-03-09 01:01:20.509308
4258	YKSN015	Tri Astutik	f	3315145603900002	/uploads/YKSN015_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Tri astutik	Tri Astutik	t	2026-03-09 01:01:20.509308
4259	YKSN015	Anidya Nisa Ardani	f	3173056408170004	/uploads/YKSN015_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Anidya nisa ardani	Anidya Nisa Ardani	t	2026-03-09 01:01:20.509308
4260	YKSN016	Ahmad Zuhair Dzulfiqor	f	3318160605970001	/uploads/YKSN016_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ahmad Zuhair Dzulfiqor	Ahmad Zuhair Dzulfiqor	t	2026-03-09 01:01:20.509308
4261	YKSN017	Renung Zulaji	f	3318102708850003	/uploads/YKSN017_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	RENUNG ZULAJI	Renung Zulaji	t	2026-03-09 01:01:20.509308
4262	YKSN017	Satya Nicky Zulaji	f	3318106602070001	/uploads/YKSN017_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	SATYA NICKY ZULAJI	Satya Nicky Zulaji	t	2026-03-09 01:01:20.509308
4263	YKSN017	Abdul Aziz Maulana	f	3671022903070011	/uploads/YKSN017_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	ABDUL AZIZ MAULANA	Abdul Aziz Maulana	t	2026-03-09 01:01:20.509308
4264	YKSN017	Elmira Novianazulaji	f	3671022903070011	/uploads/YKSN017_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	ELMIRA NOVIANAZULAJI	Elmira Novianazulaji	t	2026-03-09 01:01:20.509308
4265	YKSN018	Muhimatul Kasanah	f	3318106106830003	/uploads/YKSN018_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Muhimatul Kasanah	Muhimatul Kasanah	t	2026-03-09 01:01:20.509308
4266	YKSN018	Himawari Marta Zulaji	f	3318105002220001	/uploads/YKSN018_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Himawari Marta Zulaji	Himawari Marta Zulaji	t	2026-03-09 01:01:20.509308
4267	YKSN019	Yoyok Suprayitno	t	3175082103810003	/uploads/YKSN019_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Yoyok Suprayitno	Yoyok Suprayitno	t	2026-03-09 01:01:20.509308
4268	YKSN019	Athar Rafid Fathallah	f	3175081804160001	/uploads/YKSN019_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Athar Rafid fathallah	Athar Rafid Fathallah	t	2026-03-09 01:01:20.509308
4269	YKSN021	Sapta Mupakat Tatar Purba	f	62710313017510001	/uploads/YKSN021_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Sapta Mupakat Tatar Purba	Sapta Mupakat Tatar Purba	t	2026-03-09 01:01:20.509308
4619	YKSN150	Nova Tio Saputra	f	3501032111080001	/uploads/YKSN150_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	NOVA TIO SAPUTRA	Nova Tio Saputra	t	2026-03-09 01:01:20.509308
4658	YKSN166	M Saiful Mu'Min	f	3329031806060003	/uploads/YKSN166_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	M. Saiful Mu'min	M Saiful Mu'Min	t	2026-03-09 01:01:20.509308
4697	YKSN186	Aditya Irwan Syahrudin	t	3276022005860019	/uploads/YKSN186_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Aditya irwan syahrudin	Aditya Irwan Syahrudin	t	2026-03-09 01:01:20.509308
4736	YKSN301	Sundari	f	3305265412830003	/uploads/YKSN301_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Sundari	Sundari	t	2026-03-09 01:01:20.509308
4307	YKSN037	Valen Tino Febrian	f	3319030602070001		f	\N	\N	2026-03-09 01:01:20.509308	2	Valen tino febrian	Valen Tino Febrian	t	2026-03-09 01:01:20.509308
4815	YKSN311	Karso	f	3301131306720002		f	\N	\N	2026-03-09 01:01:20.509308	3	KARSO	Karso	t	2026-03-09 01:01:20.509308
4271	YKSN021	Rafael Jayado Gamaliel Purba	f	62710317090900003	/uploads/YKSN021_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Rafael jayado gamaliel purba	Rafael Jayado Gamaliel Purba	t	2026-03-09 01:01:20.509308
4272	YKSN022	Azizah Ali	f	3175066501630001	/uploads/YKSN022_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Azizah ali	Azizah Ali	t	2026-03-09 01:01:20.509308
4273	YKSN023	Maskan Pietanto	t	3271052104740025	/uploads/YKSN023_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Maskan pietanto	Maskan Pietanto	t	2026-03-09 01:01:20.509308
4274	YKSN024	Ayu Widya Yanti	t	3516134402900001	/uploads/YKSN024_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ayu Widya Yanti	Ayu Widya Yanti	t	2026-03-09 01:01:20.509308
4275	YKSN025	Abdul Rahman Jabbar	f	3617083103940001	/uploads/YKSN025_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Abdul rahman jabbar	Abdul Rahman Jabbar	t	2026-03-09 01:01:20.509308
4276	YKSN026	Waluyo	t	3171032810780012	/uploads/YKSN026_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Waluyo	Waluyo	t	2026-03-09 01:01:20.509308
4277	YKSN026	Desi Rinawati	f	3328136212890001	/uploads/YKSN026_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Desi Rinawati	Desi Rinawati	t	2026-03-09 01:01:20.509308
4278	YKSN026	Tegar Arsy Dirmansyah	f	3328132610140001	/uploads/YKSN026_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Tegar Arsy Dirmansyah	Tegar Arsy Dirmansyah	t	2026-03-09 01:01:20.509308
4279	YKSN027	Akhmad Burhanudin	t	3674031210750008	/uploads/YKSN027_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Akhmad Burhanudin	Akhmad Burhanudin	t	2026-03-09 01:01:20.509308
4280	YKSN027	Rini Suprapti	f	3674034608800003	/uploads/YKSN027_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Rini Suprapti	Rini Suprapti	t	2026-03-09 01:01:20.509308
4281	YKSN027	Andra Rizki Wahyutama	f	3674031502080006	/uploads/YKSN027_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Andra Rizki Wahyutama	Andra Rizki Wahyutama	t	2026-03-09 01:01:20.509308
4282	YKSN027	Adriansyah Ramadhan	f	3674031708120010	/uploads/YKSN027_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Adriansyah Ramadhan	Adriansyah Ramadhan	t	2026-03-09 01:01:20.509308
4283	YKSN029	Firda Ainun Asmarani	f	3328046212980004	/uploads/YKSN029_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Firda Ainun Asmarani	Firda Ainun Asmarani	t	2026-03-09 01:01:20.509308
4284	YKSN029	Aprian Matdiansyah	f	3175100904961001	/uploads/YKSN029_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Aprian Matdiansyah	Aprian Matdiansyah	t	2026-03-09 01:01:20.509308
4285	YKSN029	Fatih Altaf Pradipta	f	3175100610240003	/uploads/YKSN029_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Fatih Altaf Pradipta	Fatih Altaf Pradipta	t	2026-03-09 01:01:20.509308
4286	YKSN030	Yulia Irfan Saputra	t	3328092407930006	/uploads/YKSN030_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	YULIA IRFAN SAPUTRA	Yulia Irfan Saputra	t	2026-03-09 01:01:20.509308
4287	YKSN031	Nurbaeti	t	3173054205920004	/uploads/YKSN031_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Nurbaeti	Nurbaeti	t	2026-03-09 01:01:20.509308
4288	YKSN031	Agus Andika	f	3671130909860005	/uploads/YKSN031_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Agus Andika	Agus Andika	t	2026-03-09 01:01:20.509308
4289	YKSN032	Encum Sumiati	t	3171036409851002	/uploads/YKSN032_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Encum sumiati	Encum Sumiati	t	2026-03-09 01:01:20.509308
4290	YKSN032	Joko Mulyanto	f	3171030804710012	/uploads/YKSN032_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Joko Mulyanto	Joko Mulyanto	t	2026-03-09 01:01:20.509308
4291	YKSN032	Fikri Wicaksana Mulyanto	f	3171032512081001	/uploads/YKSN032_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Fikri wicaksana mulyanto	Fikri Wicaksana Mulyanto	t	2026-03-09 01:01:20.509308
4292	YKSN032	Fakhrul Mulyanto	f	3171032103141002	/uploads/YKSN032_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Fakhrul mulyanto	Fakhrul Mulyanto	t	2026-03-09 01:01:20.509308
4293	YKSN033	Maria Citra Ayu Pramitawati	t	3374064608910002	/uploads/YKSN033_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	MARIA CITRA AYU PRAMITAWATI	Maria Citra Ayu Pramitawati	t	2026-03-09 01:01:20.509308
4294	YKSN033	MC Supriyati	f	3374065204650002	/uploads/YKSN033_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	MC SUPRIYATI	MC Supriyati	t	2026-03-09 01:01:20.509308
4295	YKSN033	Jonathan Alvarendra	f	3374060603200006	/uploads/YKSN033_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	JONATHAN ALVARENDRA	Jonathan Alvarendra	t	2026-03-09 01:01:20.509308
4296	YKSN033	Eliana Miracle	f	3374066404250002	/uploads/YKSN033_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	ELIANA MIRACLE	Eliana Miracle	t	2026-03-09 01:01:20.509308
4297	YKSN034	Ismail	t	3671012104770006	/uploads/YKSN034_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ismail	Ismail	t	2026-03-09 01:01:20.509308
4298	YKSN034	Sunarti	f	3671016203830008	/uploads/YKSN034_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Sunarti	Sunarti	t	2026-03-09 01:01:20.509308
4299	YKSN034	Aryo Putra Maulana	f	3671012612090005	/uploads/YKSN034_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Aryo putra maulana	Aryo Putra Maulana	t	2026-03-09 01:01:20.509308
4300	YKSN034	Said Ardiansah	f	3671012210140003	/uploads/YKSN034_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Said Ardiansah	Said Ardiansah	t	2026-03-09 01:01:20.509308
4301	YKSN035	Muhammad Shofuwan	t	3671011004030006	/uploads/YKSN035_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	MUHAMMAD SHOFUWAN	Muhammad Shofuwan	t	2026-03-09 01:01:20.509308
4302	YKSN036	Bambang Sukirno	f	3321141507780002	/uploads/YKSN036_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Bambang Sukirno	Bambang Sukirno	t	2026-03-09 01:01:20.509308
4303	YKSN036	Komariyah	t	3321144708820001	/uploads/YKSN036_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Komariyah	Komariyah	t	2026-03-09 01:01:20.509308
4304	YKSN036	Andika Gusti Restu Putra	f	3321141001040001	/uploads/YKSN036_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Andika Gusti Restu Putra	Andika Gusti Restu Putra	t	2026-03-09 01:01:20.509308
4305	YKSN036	Muhammad Farid Attalah	f	3174050408160001	/uploads/YKSN036_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Muhammad Farid Attalah	Muhammad Farid Attalah	t	2026-03-09 01:01:20.509308
4306	YKSN037	Fajar Adi Saputra	t	3319032010970003	/uploads/YKSN037_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Fajar adi saputra	Fajar Adi Saputra	t	2026-03-09 01:01:20.509308
4775	YKSN215	Endah Sulastari	f	3305164204960003	/uploads/YKSN215_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Endah Sulastari	Endah Sulastari	t	2026-03-09 01:01:20.509308
4816	YKSN229	Toifudin	t	3301102006880002	/uploads/YKSN229_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Toifudin	Toifudin	t	2026-03-09 01:01:20.509308
4855	YKSN246	Ai Susi Nuryati	t	3206296009040007	/uploads/YKSN246_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ai Susi Nuryati	Ai Susi Nuryati	t	2026-03-09 01:01:20.509308
4932	YKSN276	Muhammad Anfaza Firmanzani, S.m.	t	3204283008990002	/uploads/YKSN276_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Muhammad Anfaza Firmanzani, S.M.	Muhammad Anfaza Firmanzani, S.m.	t	2026-03-09 01:01:20.509308
4319	YKSN043	Moch. Lizamil Romadoni	f	3513232712990003		f	\N	\N	2026-03-09 01:01:20.509308	2	Moch. Lizamil Romadoni	Moch. Lizamil Romadoni	t	2026-03-09 01:01:20.509308
4309	YKSN039	Ahmad Ainun Niam	t	3318201512950010	/uploads/YKSN039_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ahmad Ainun Niam	Ahmad Ainun Niam	t	2026-03-09 01:01:20.509308
4310	YKSN039	Rifqi Rahmawati	f	3318204505990004	/uploads/YKSN039_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Rifqi Rahmawati	Rifqi Rahmawati	t	2026-03-09 01:01:20.509308
4311	YKSN040	Muhamad Taufiq Basori	t	3315122509900001	/uploads/YKSN040_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Muhamad taufiq basori	Muhamad Taufiq Basori	t	2026-03-09 01:01:20.509308
4312	YKSN040	Rizka Aprilia A	f	3315146504940002	/uploads/YKSN040_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Rizka aprilia a	Rizka Aprilia A	t	2026-03-09 01:01:20.509308
4313	YKSN041	Jumari	t	3173071007800014	/uploads/YKSN041_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Jumari	Jumari	t	2026-03-09 01:01:20.509308
4314	YKSN041	Irwanti	f	3173076808870009	/uploads/YKSN041_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Irwanti	Irwanti	t	2026-03-09 01:01:20.509308
4315	YKSN041	Muhammad Azam Anwar	f	3173071503151001	/uploads/YKSN041_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Muhammad Azam Anwar	Muhammad Azam Anwar	t	2026-03-09 01:01:20.509308
4316	YKSN041	Muhammad Khoirul Misbah	f	3173072306190002	/uploads/YKSN041_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Muhammad Khoirul Misbah	Muhammad Khoirul Misbah	t	2026-03-09 01:01:20.509308
4317	YKSN042	Khamim Sahudi	t	3173070805820010	/uploads/YKSN042_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Khamim sahudi	Khamim Sahudi	t	2026-03-09 01:01:20.509308
4318	YKSN043	Muhammad Alfatoni	t	3513232509010002	/uploads/YKSN043_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Muhammad Alfatoni	Muhammad Alfatoni	t	2026-03-09 01:01:20.509308
4320	YKSN044	Ian Wahyuningtyas	t	3578116112960004	/uploads/YKSN044_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ian Wahyuningtyas	Ian Wahyuningtyas	t	2026-03-09 01:01:20.509308
4321	YKSN045	Delvyan Putri Suryaningrum	t	3518044901980002	/uploads/YKSN045_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Delvyan Putri Suryaningrum	Delvyan Putri Suryaningrum	t	2026-03-09 01:01:20.509308
4322	YKSN046	Anwarul Ihsan	t	3503092210020001	/uploads/YKSN046_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	ANWARUL IHSAN	Anwarul Ihsan	t	2026-03-09 01:01:20.509308
4323	YKSN047	Ajeng Rara Tirta	t	3174016901900003	/uploads/YKSN047_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ajeng Rara Tirta	Ajeng Rara Tirta	t	2026-03-09 01:01:20.509308
4324	YKSN047	Alula Shahia Wibisono	f	3174016712170005	/uploads/YKSN047_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Alula Shahia Wibisono	Alula Shahia Wibisono	t	2026-03-09 01:01:20.509308
4325	YKSN048	Mokh. Ali Wafah	t	3514230211920003	/uploads/YKSN048_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Mokh. Ali Wafah	Mokh. Ali Wafah	t	2026-03-09 01:01:20.509308
4326	YKSN049	Siti Mutoharoh	f	3327015511820004	/uploads/YKSN049_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	SITI MUTOHAROH	Siti Mutoharoh	t	2026-03-09 01:01:20.509308
4327	YKSN050	Maenah	f	3328055001880003	/uploads/YKSN050_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Maenah	Maenah	t	2026-03-09 01:01:20.509308
4328	YKSN050	Azizah Humairoh	f	3328056708170003	/uploads/YKSN050_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	AZIZAH HUMAIROH	Azizah Humairoh	t	2026-03-09 01:01:20.509308
4329	YKSN050	Muhammad Zikri Al Alifi	f	3328051411110001	/uploads/YKSN050_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Muhammad zikri Al alifi	Muhammad Zikri Al Alifi	t	2026-03-09 01:01:20.509308
4330	YKSN050	Isyanto	f	3328051208820005	/uploads/YKSN050_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Isyanto	Isyanto	t	2026-03-09 01:01:20.509308
4331	YKSN051	Choirun Nasirin	t	3275081005790028	/uploads/YKSN051_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Choirun Nasirin	Choirun Nasirin	t	2026-03-09 01:01:20.509308
4332	YKSN051	Wuryatni	f	3275086307790010	/uploads/YKSN051_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Wuryatni	Wuryatni	t	2026-03-09 01:01:20.509308
4333	YKSN051	Muhammad Fathan Al Khoiran	f	3327101910110003	/uploads/YKSN051_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Muhammad Fathan Al Khoiran	Muhammad Fathan Al Khoiran	t	2026-03-09 01:01:20.509308
4334	YKSN051	Muhammad Reyfan Ramadhan	f	3275080905190001	/uploads/YKSN051_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Muhammad Reyfan Ramadhan	Muhammad Reyfan Ramadhan	t	2026-03-09 01:01:20.509308
4335	YKSN052	Muh Fazikin	t	3324190402870001	/uploads/YKSN052_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Muh fazikin	Muh Fazikin	t	2026-03-09 01:01:20.509308
4336	YKSN052	Zulaechah	f	3324165706880001	/uploads/YKSN052_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Zulaechah	Zulaechah	t	2026-03-09 01:01:20.509308
4337	YKSN052	Arya Guna Pratama	f	3324192209140001	/uploads/YKSN052_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Arya guna pratama	Arya Guna Pratama	t	2026-03-09 01:01:20.509308
4338	YKSN052	Auliya Lhoirunnisa	f	3324196906190003	/uploads/YKSN052_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Auliya lhoirunnisa	Auliya Lhoirunnisa	t	2026-03-09 01:01:20.509308
4339	YKSN053	Mei Desi Irmasari Ompusunggu	t	1208124409930002	/uploads/YKSN053_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Mei Desi Irmasari Ompusunggu	Mei Desi Irmasari Ompusunggu	t	2026-03-09 01:01:20.509308
4340	YKSN053	Nia Eno Sawitri Simanjuntak	f	1208205811940001	/uploads/YKSN053_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Nia Eno Sawitri Simanjuntak	Nia Eno Sawitri Simanjuntak	t	2026-03-09 01:01:20.509308
4341	YKSN053	Mawar Nurjanah Ompusunggu	f	1208124310970004	/uploads/YKSN053_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Mawar Nurjanah Ompusunggu	Mawar Nurjanah Ompusunggu	t	2026-03-09 01:01:20.509308
4342	YKSN054	Agung Setyawan	t	3315182003950002	/uploads/YKSN054_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	AGUNG SETYAWAN	Agung Setyawan	t	2026-03-09 01:01:20.509308
4343	YKSN054	Ira Setia Ningsih	f	3175065006010015	/uploads/YKSN054_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	IRA SETIA NINGSIH	Ira Setia Ningsih	t	2026-03-09 01:01:20.509308
4344	YKSN055	Zahra Fauziyyah Utami	t	3603124912950005	/uploads/YKSN055_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Zahra Fauziyyah Utami	Zahra Fauziyyah Utami	t	2026-03-09 01:01:20.509308
4345	YKSN055	Muhammad Fajar Syahputra Lubis	f	3603051910950001	/uploads/YKSN055_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Muhammad Fajar Syahputra Lubis	Muhammad Fajar Syahputra Lubis	t	2026-03-09 01:01:20.509308
4375	YKSN063	Nuraini	f	3172046105820009		f	\N	\N	2026-03-09 01:01:20.509308	2	Nuraini	Nuraini	t	2026-03-09 01:01:20.509308
4376	YKSN063	Muhammad Arya Sutriono	f	3172042001070002		f	\N	\N	2026-03-09 01:01:20.509308	3	Muhammad arya sutriono	Muhammad Arya Sutriono	t	2026-03-09 01:01:20.509308
4377	YKSN063	Thia Nabilah	f	3172047001121006		f	\N	\N	2026-03-09 01:01:20.509308	4	Thia Nabilah	Thia Nabilah	t	2026-03-09 01:01:20.509308
4347	YKSN055	Sulasna	f	3603122104660005	/uploads/YKSN055_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Sulasna	Sulasna	t	2026-03-09 01:01:20.509308
4348	YKSN056	Idris Affandi	f	3275121703870004	/uploads/YKSN056_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Idris affandi	Idris Affandi	t	2026-03-09 01:01:20.509308
4349	YKSN056	Erlin Kristianingsih	f	3505146810920002	/uploads/YKSN056_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Erlin kristianingsih	Erlin Kristianingsih	t	2026-03-09 01:01:20.509308
4350	YKSN056	Chalista Nathania	f	3275126504160001	/uploads/YKSN056_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Chalista Nathania	Chalista Nathania	t	2026-03-09 01:01:20.509308
4351	YKSN056	Trisha Anastasya	f	3275126504180002	/uploads/YKSN056_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Trisha anastasya	Trisha Anastasya	t	2026-03-09 01:01:20.509308
4352	YKSN057	Bambang Wijianto	t	3603181603830016	/uploads/YKSN057_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Bambang wijianto	Bambang Wijianto	t	2026-03-09 01:01:20.509308
4353	YKSN057	Hartati	f	3603186303830020	/uploads/YKSN057_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Hartati	Hartati	t	2026-03-09 01:01:20.509308
4354	YKSN057	Muhammad Rasyid Elazzam	f	3603181704170004	/uploads/YKSN057_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Muhammad Rasyid ELAZZAM	Muhammad Rasyid Elazzam	t	2026-03-09 01:01:20.509308
4355	YKSN057	Halimah Shafiqah Chessa	f	3603184604210004	/uploads/YKSN057_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Halimah shafiqah chessa	Halimah Shafiqah Chessa	t	2026-03-09 01:01:20.509308
4356	YKSN058	Arif Budiman	t	3172042709850010	/uploads/YKSN058_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Arif Budiman	Arif Budiman	t	2026-03-09 01:01:20.509308
4357	YKSN058	Wilda Erfina	f	3172044911921002	/uploads/YKSN058_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Wilda Erfina	Wilda Erfina	t	2026-03-09 01:01:20.509308
4358	YKSN058	Muhammad Rifqi Wildani	f	3172042405151002	/uploads/YKSN058_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Muhammad Rifqi wildani	Muhammad Rifqi Wildani	t	2026-03-09 01:01:20.509308
4359	YKSN058	Althafun Nizam M	f	3172041112170003	/uploads/YKSN058_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	ALthafun Nizam m	Althafun Nizam M	t	2026-03-09 01:01:20.509308
4360	YKSN059	Ulfa Humairah	t	3510165905900004	/uploads/YKSN059_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ulfa humairah	Ulfa Humairah	t	2026-03-09 01:01:20.509308
4361	YKSN295	Mochammad Lucky Arta Caesar Pradana	t	3212150905030001	/uploads/YKSN295_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	MOCHAMMAD LUCKY ARTA CAESAR PRADANA	Mochammad Lucky Arta Caesar Pradana	t	2026-03-09 01:01:20.509308
4362	YKSN060	Hasan	t	3175040209751002	/uploads/YKSN060_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Hasan	Hasan	t	2026-03-09 01:01:20.509308
4363	YKSN060	Muhammad Ubaidillah Al Haddar	f	3510162511100001	/uploads/YKSN060_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Muhammad ubaidillah al haddar	Muhammad Ubaidillah Al Haddar	t	2026-03-09 01:01:20.509308
4364	YKSN060	Atiqah	f	3510166807130003	/uploads/YKSN060_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Atiqah	Atiqah	t	2026-03-09 01:01:20.509308
4366	YKSN061	Komarudin	t	3329131408910002	/uploads/YKSN061_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Komarudin	Komarudin	t	2026-03-09 01:01:20.509308
4367	YKSN061	Vinda Oktafiana	f	3674034110910006	/uploads/YKSN061_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Vinda Oktafiana	Vinda Oktafiana	t	2026-03-09 01:01:20.509308
4368	YKSN061	Afifah Hilya Nafisah	f	3674036810200001	/uploads/YKSN061_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Afifah Hilya Nafisah	Afifah Hilya Nafisah	t	2026-03-09 01:01:20.509308
4369	YKSN061	Adnan Ardani	f	3674030305250002	/uploads/YKSN061_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Adnan Ardani	Adnan Ardani	t	2026-03-09 01:01:20.509308
4370	YKSN062	Deta Alci Ardian Syah	t	3376011112960003	/uploads/YKSN062_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Deta Alci Ardian Syah	Deta Alci Ardian Syah	t	2026-03-09 01:01:20.509308
4371	YKSN062	Agus Ediyanto, Se	f	3175030505730012	/uploads/YKSN062_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Agus Ediyanto, SE	Agus Ediyanto, Se	t	2026-03-09 01:01:20.509308
4372	YKSN062	Kathie Handayani F. Se.	f	3175036009730004	/uploads/YKSN062_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Kathie Handayani F. SE.	Kathie Handayani F. Se.	t	2026-03-09 01:01:20.509308
4373	YKSN062	Gusthia Andriane Fathimah	f	3175035909080008	/uploads/YKSN062_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Gusthia Andriane Fathimah	Gusthia Andriane Fathimah	t	2026-03-09 01:01:20.509308
4374	YKSN063	Sutikno	t	3172040309790012	/uploads/YKSN063_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Sutikno	Sutikno	t	2026-03-09 01:01:20.509308
4378	YKSN064	Imawan Ainul Habib	t	3175020508040001	/uploads/YKSN064_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	imawan ainul habib	Imawan Ainul Habib	t	2026-03-09 01:01:20.509308
4379	YKSN064	Esi Sukaesih	f	3175025401790002	/uploads/YKSN064_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Esi sukaesih	Esi Sukaesih	t	2026-03-09 01:01:20.509308
4380	YKSN064	Ajeng Pramesti Diah Anjani	f	3175026112101007	/uploads/YKSN064_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Ajeng pramesti diah anjani	Ajeng Pramesti Diah Anjani	t	2026-03-09 01:01:20.509308
4381	YKSN065	Gurit Madyarini	t	3324146808870002	/uploads/YKSN065_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Gurit Madyarini	Gurit Madyarini	t	2026-03-09 01:01:20.509308
4382	YKSN066	Agus Susilo	t	3321101311870001	/uploads/YKSN066_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Agus Susilo	Agus Susilo	t	2026-03-09 01:01:20.509308
4383	YKSN066	Purwati	f	3315025106890001	/uploads/YKSN066_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Purwati	Purwati	t	2026-03-09 01:01:20.509308
4384	YKSN066	Rahma Salsabila Agustin	f	3315025910100002	/uploads/YKSN066_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Rahma Salsabila Agustin	Rahma Salsabila Agustin	t	2026-03-09 01:01:20.509308
4365	YKSN060	Ahmad Salim	f	3175042611170002	/uploads/YKSN060_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Ahmad salim	Ahmad Salim	t	2026-03-09 01:01:20.509308
4386	YKSN067	Mahesa Gading Alfarisi	f	3216022812220004		f	\N	\N	2026-03-09 01:01:20.509308	2	Mahesa gading alfarisi	Mahesa Gading Alfarisi	t	2026-03-09 01:01:20.509308
4387	YKSN067	Wahyu Ira Aprilia	t	3216021604990006	/uploads/YKSN067_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Wahyu ira aprilia	Wahyu Ira Aprilia	t	2026-03-09 01:01:20.509308
4388	YKSN068	Susanto Y	t	3277023006970009	/uploads/YKSN068_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Susanto Y	Susanto Y	t	2026-03-09 01:01:20.509308
4389	YKSN069	Danni Prasetyo	t	3320160911980002	/uploads/YKSN069_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	danni prasetyo	Danni Prasetyo	t	2026-03-09 01:01:20.509308
4390	YKSN070	Munawar	t	3318121411950004	/uploads/YKSN070_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Munawar	Munawar	t	2026-03-09 01:01:20.509308
4391	YKSN071	Abdurrohman Ilyas	f	3521110408060003	/uploads/YKSN071_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Abdurrohman ilyas	Abdurrohman Ilyas	t	2026-03-09 01:01:20.509308
4392	YKSN071	Muchammad Masruri	f	3315111608960002	/uploads/YKSN071_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Muchammad masruri	Muchammad Masruri	t	2026-03-09 01:01:20.509308
4393	YKSN071	Nurkholis	f	3317092605830001	/uploads/YKSN071_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Nurkholis	Nurkholis	t	2026-03-09 01:01:20.509308
4394	YKSN071	Satria Pradhana	f	3521112904130001	/uploads/YKSN071_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Satria pradhana	Satria Pradhana	t	2026-03-09 01:01:20.509308
4395	YKSN072	Ridwan	t	3522121005970003	/uploads/YKSN072_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	RIDWAN	Ridwan	t	2026-03-09 01:01:20.509308
4396	YKSN072	Nurul Aini	f	3522165701000001	/uploads/YKSN072_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Nurul Aini	Nurul Aini	t	2026-03-09 01:01:20.509308
4397	YKSN072	Muhammad Rayyan Adhiyatama	f	3522282306230001	/uploads/YKSN072_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Muhammad Rayyan Adhiyatama	Muhammad Rayyan Adhiyatama	t	2026-03-09 01:01:20.509308
4398	YKSN073	Brian Apung Ramadani	t	3578040604910003	/uploads/YKSN073_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	brian apung ramadani	Brian Apung Ramadani	t	2026-03-09 01:01:20.509308
4399	YKSN073	Putri Ratna Sari	f	3578036802940003	/uploads/YKSN073_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	putri ratna sari	Putri Ratna Sari	t	2026-03-09 01:01:20.509308
4400	YKSN073	Richie Aldebaran Dharmaputra	f	3578041801210002	/uploads/YKSN073_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	richie aldebaran dharmaputra	Richie Aldebaran Dharmaputra	t	2026-03-09 01:01:20.509308
4401	YKSN073	Jowy Altair Abhiseva	f	3578042003240001	/uploads/YKSN073_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	jowy altair abhiseva	Jowy Altair Abhiseva	t	2026-03-09 01:01:20.509308
4402	YKSN074	Aiza Nabila Hasan	t	1871115202970001	/uploads/YKSN074_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Aiza Nabila Hasan	Aiza Nabila Hasan	t	2026-03-09 01:01:20.509308
4403	YKSN074	Richi Tirta Harry Sukamto	f	3574041512960001	/uploads/YKSN074_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Richi Tirta Harry Sukamto	Richi Tirta Harry Sukamto	t	2026-03-09 01:01:20.509308
4404	YKSN074	Oceana Aliya Shakira Sukamto	f	1871116305220001	/uploads/YKSN074_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Oceana Aliya Shakira Sukamto	Oceana Aliya Shakira Sukamto	t	2026-03-09 01:01:20.509308
4405	YKSN074	Rachel Allysa Sukamto	f	1871115004230002	/uploads/YKSN074_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Rachel Allysa Sukamto	Rachel Allysa Sukamto	t	2026-03-09 01:01:20.509308
4406	YKSN075	Wahyudin Setiawan	t	3175062310990009	/uploads/YKSN075_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Wahyudin Setiawan	Wahyudin Setiawan	t	2026-03-09 01:01:20.509308
4407	YKSN076	Charlie B Mansur	t	3175060408710012	/uploads/YKSN076_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Charlie B Mansur	Charlie B Mansur	t	2026-03-09 01:01:20.509308
4408	YKSN076	Darmini	f	3175065408780011	/uploads/YKSN076_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Darmini	Darmini	t	2026-03-09 01:01:20.509308
4409	YKSN076	Rafi Kurniawan	f	3175062405060002	/uploads/YKSN076_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Rafi Kurniawan	Rafi Kurniawan	t	2026-03-09 01:01:20.509308
4410	YKSN076	Azizah Nayyira	f	3175066903230003	/uploads/YKSN076_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Azizah Nayyira	Azizah Nayyira	t	2026-03-09 01:01:20.509308
4411	YKSN077	M Madun	f	3201370908700003	/uploads/YKSN077_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	M. Madun	M Madun	t	2026-03-09 01:01:20.509308
4412	YKSN077	Salimah	f	3201374107710026	/uploads/YKSN077_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Salimah	Salimah	t	2026-03-09 01:01:20.509308
4413	YKSN077	Melan Selvia	f	3201377000110001	/uploads/YKSN077_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Melan selvia	Melan Selvia	t	2026-03-09 01:01:20.509308
4414	YKSN078	Siti Lathifah Fatayati	f	3303124908980001	/uploads/YKSN078_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Siti Lathifah Fatayati	Siti Lathifah Fatayati	t	2026-03-09 01:01:20.509308
4415	YKSN078	Nanik Maulidah	f	3303124809930001	/uploads/YKSN078_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Nanik Maulidah	Nanik Maulidah	t	2026-03-09 01:01:20.509308
4416	YKSN079	Zainal Abidn	f	3173012511790019	/uploads/YKSN079_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Zainal abidn	Zainal Abidn	t	2026-03-09 01:01:20.509308
4417	YKSN080	Auzi Maulana	t	3304102708910002	/uploads/YKSN080_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Auzi Maulana	Auzi Maulana	t	2026-03-09 01:01:20.509308
4418	YKSN080	Rossy Siti N	f	3205054611950001	/uploads/YKSN080_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Rossy Siti N	Rossy Siti N	t	2026-03-09 01:01:20.509308
4419	YKSN080	Rishana Nuraizza F	f	3205056006190002	/uploads/YKSN080_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Rishana Nuraizza F	Rishana Nuraizza F	t	2026-03-09 01:01:20.509308
4420	YKSN080	Muhammad Fathaan A	f	3205052304210002	/uploads/YKSN080_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Muhammad Fathaan A	Muhammad Fathaan A	t	2026-03-09 01:01:20.509308
4421	YKSN081	Junaedi Bin Kamid	f	3173081607800005	/uploads/YKSN081_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Junaedi Bin Kamid	Junaedi Bin Kamid	t	2026-03-09 01:01:20.509308
4422	YKSN081	Winarni	f	3304144901840001	/uploads/YKSN081_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Winarni	Winarni	t	2026-03-09 01:01:20.509308
4423	YKSN081	Ramadaniel Gustiano Putra	f	3304140108120002	/uploads/YKSN081_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Ramadaniel Gustiano Putra	Ramadaniel Gustiano Putra	t	2026-03-09 01:01:20.509308
4440	YKSN086	Muhammad Rizky Sarega	f	3173052911111006	/uploads/YKSN086_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Muhammad Rizky Sarega	Muhammad Rizky Sarega	t	2026-03-09 01:01:20.509308
4425	YKSN082	Shinta Nur Afifah	t	3307085409000002	/uploads/YKSN082_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Shinta Nur Afifah	Shinta Nur Afifah	t	2026-03-09 01:01:20.509308
4426	YKSN083	Saeful Hidayat	f	3604111303820002	/uploads/YKSN083_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Saeful Hidayat	Saeful Hidayat	t	2026-03-09 01:01:20.509308
4428	YKSN083	Zahratul Aulia Putri	f	3604116404090001	/uploads/YKSN083_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Zahratul Aulia Putri	Zahratul Aulia Putri	t	2026-03-09 01:01:20.509308
4429	YKSN083	Muhammad Rifki Hidayat	f	3604351704140001	/uploads/YKSN083_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Muhammad Rifki Hidayat	Muhammad Rifki Hidayat	t	2026-03-09 01:01:20.509308
4430	YKSN084	Tedi Supriyono	f	3101011606670001	/uploads/YKSN084_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Tedi supriyono	Tedi Supriyono	t	2026-03-09 01:01:20.509308
4431	YKSN084	Asiyah	f	3101015708740001	/uploads/YKSN084_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Asiyah	Asiyah	t	2026-03-09 01:01:20.509308
4432	YKSN084	Debik Tegar Pradilah	f	3101013003990002	/uploads/YKSN084_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Debik tegar pradilah	Debik Tegar Pradilah	t	2026-03-09 01:01:20.509308
4433	YKSN084	Enggar Bhanu Pramoedya	f	3101011304170002	/uploads/YKSN084_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Enggar bhanu pramoedya	Enggar Bhanu Pramoedya	t	2026-03-09 01:01:20.509308
4434	YKSN085	Denok Murtasiyah	t	3174046404770005	/uploads/YKSN085_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Denok Murtasiyah	Denok Murtasiyah	t	2026-03-09 01:01:20.509308
4435	YKSN085	Muhammad Zidane Al Hafidz	f	3174040908060007	/uploads/YKSN085_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Muhammad Zidane Al Hafidz	Muhammad Zidane Al Hafidz	t	2026-03-09 01:01:20.509308
4436	YKSN085	Muhammad Valent Ar-Rasyid	f	3174041802101003	/uploads/YKSN085_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Muhammad Valent Ar-Rasyid	Muhammad Valent Ar-Rasyid	t	2026-03-09 01:01:20.509308
4437	YKSN085	Kiandra Nur Shakinah Ilyasinta Putri	f	3174044503131006	/uploads/YKSN085_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Kiandra Nur Shakinah Ilyasinta Putri	Kiandra Nur Shakinah Ilyasinta Putri	t	2026-03-09 01:01:20.509308
4438	YKSN086	Sarjono	t	3323160612730001	/uploads/YKSN086_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Sarjono	Sarjono	t	2026-03-09 01:01:20.509308
4439	YKSN086	Mega Irawati	f	3173056805890006	/uploads/YKSN086_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Mega Irawati	Mega Irawati	t	2026-03-09 01:01:20.509308
4441	YKSN087	Arimbi Silvia Fanani	t	3323157004990001	/uploads/YKSN087_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Arimbi Silvia Fanani	Arimbi Silvia Fanani	t	2026-03-09 01:01:20.509308
4442	YKSN305	Artalha Youana	f	3323195108950002	/uploads/YKSN305_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Artalha Youana	Artalha Youana	t	2026-03-09 01:01:20.509308
4443	YKSN306	Indrawati	t	3276096807730001	/uploads/YKSN306_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Indrawati	Indrawati	t	2026-03-09 01:01:20.509308
4444	YKSN088	M Ali Nuryanto	t	3171071007830010	/uploads/YKSN088_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	M Ali Nuryanto	M Ali Nuryanto	t	2026-03-09 01:01:20.509308
4445	YKSN088	Fitria	f	3171075505880003	/uploads/YKSN088_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Fitria	Fitria	t	2026-03-09 01:01:20.509308
4446	YKSN088	Alifia Ramadani	f	3171076508090003	/uploads/YKSN088_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Alifia Ramadani	Alifia Ramadani	t	2026-03-09 01:01:20.509308
4447	YKSN089	Muhammad Ardhian Nurul Falah	t	3309052302999006	/uploads/YKSN089_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Muhammad Ardhian Nurul Falah	Muhammad Ardhian Nurul Falah	t	2026-03-09 01:01:20.509308
4448	YKSN090	Aisyah Nurul Ichsan	t	3314145706010003	/uploads/YKSN090_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Aisyah Nurul Ichsan	Aisyah Nurul Ichsan	t	2026-03-09 01:01:20.509308
4449	YKSN091	Siti Hajar Rahmawati	t	3310184206930001	/uploads/YKSN091_pass_1.png	f	\N	\N	2026-03-09 01:01:20.509308	1	Siti Hajar Rahmawati	Siti Hajar Rahmawati	t	2026-03-09 01:01:20.509308
4450	YKSN091	Iwan Budiono	f	3603122905790001	/uploads/YKSN091_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Iwan Budiono	Iwan Budiono	t	2026-03-09 01:01:20.509308
4451	YKSN092	Nuril Huda	f	3310110807810005	/uploads/YKSN092_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Nuril huda	Nuril Huda	t	2026-03-09 01:01:20.509308
4453	YKSN093	Riski Tisnahayu	t	199709062025062010	/uploads/YKSN093_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Riski Tisnahayu	Riski Tisnahayu	t	2026-03-09 01:01:20.509308
4454	YKSN095	Diya Rofika Rahmawati	t	1502135412990002	/uploads/YKSN095_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Diya Rofika Rahmawati	Diya Rofika Rahmawati	t	2026-03-09 01:01:20.509308
4455	YKSN095	Jumi'Ah	f	1502137112620002	/uploads/YKSN095_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Jumi'ah	Jumi'Ah	t	2026-03-09 01:01:20.509308
4456	YKSN307	Muhamad Iqbal	t	3172030507850008	/uploads/YKSN307_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Muhamad iqbal	Muhamad Iqbal	t	2026-03-09 01:01:20.509308
4457	YKSN307	Chairunissa	f	\N	/uploads/YKSN307_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Chairunissa	Chairunissa	t	2026-03-09 01:01:20.509308
4458	YKSN307	Naufal	f	\N	/uploads/YKSN307_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Naufal	Naufal	t	2026-03-09 01:01:20.509308
4459	YKSN307	Dara	f	\N	/uploads/YKSN307_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Dara	Dara	t	2026-03-09 01:01:20.509308
4460	YKSN096	Danang Rahmat	t	3175021706890008	/uploads/YKSN096_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Danang Rahmat	Danang Rahmat	t	2026-03-09 01:01:20.509308
4461	YKSN096	Endang Rochjati	f	3175024808540005	/uploads/YKSN096_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Endang Rochjati	Endang Rochjati	t	2026-03-09 01:01:20.509308
4462	YKSN096	Alif Fajrin Kalandra	f	3273130909160001	/uploads/YKSN096_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Alif Fajrin Kalandra	Alif Fajrin Kalandra	t	2026-03-09 01:01:20.509308
4427	YKSN083	Aminah	f	3604115303870006	/uploads/YKSN083_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Aminah	Aminah	t	2026-03-09 01:01:20.509308
4452	YKSN092	Retno Winanti	f	3310116109840002	/uploads/YKSN092_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Retno winanti	Retno Winanti	t	2026-03-09 01:01:20.509308
4495	YKSN294	Khalisa Sarah Alzena	f	3216074901240001		f	\N	\N	2026-03-09 01:01:20.509308	1	Khalisa Sarah Alzena	Khalisa Sarah Alzena	t	2026-03-09 01:01:20.509308
4464	YKSN097	Budiman	t	3304091808910001	/uploads/YKSN097_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Budiman	Budiman	t	2026-03-09 01:01:20.509308
4465	YKSN097	Siti Sopiyaj	f	3201205109950003	/uploads/YKSN097_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Siti Sopiyaj	Siti Sopiyaj	t	2026-03-09 01:01:20.509308
4466	YKSN097	Ayesha Nayyara Ramadhina	f	3201207003230001	/uploads/YKSN097_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Ayesha Nayyara Ramadhina	Ayesha Nayyara Ramadhina	t	2026-03-09 01:01:20.509308
4467	YKSN098	Slamet Riyadi	t	3603122409760014	/uploads/YKSN098_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Slamet riyadi	Slamet Riyadi	t	2026-03-09 01:01:20.509308
4468	YKSN098	Dani Wahyuni	f	3603125911810010	/uploads/YKSN098_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Dani wahyuni	Dani Wahyuni	t	2026-03-09 01:01:20.509308
4469	YKSN098	Ayu Riandini	f	3603126108040016	/uploads/YKSN098_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Ayu riandini	Ayu Riandini	t	2026-03-09 01:01:20.509308
4470	YKSN098	Almira Oktafiani	f	3603124310090008	/uploads/YKSN098_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Almira oktafiani	Almira Oktafiani	t	2026-03-09 01:01:20.509308
4471	YKSN099	Suwarno	f	3307081104660005	/uploads/YKSN099_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Suwarno	Suwarno	t	2026-03-09 01:01:20.509308
4472	YKSN099	Sarmiyatun	f	3175075103680013	/uploads/YKSN099_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Sarmiyatun	Sarmiyatun	t	2026-03-09 01:01:20.509308
4473	YKSN099	Tabah Putra Wardana	f	3175072302000009	/uploads/YKSN099_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Tabah Putra Wardana	Tabah Putra Wardana	t	2026-03-09 01:01:20.509308
4474	YKSN100	Khamim	f	3303041108740002	/uploads/YKSN100_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Khamim	Khamim	t	2026-03-09 01:01:20.509308
4475	YKSN100	Sujini	f	3303044602820003	/uploads/YKSN100_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Sujini	Sujini	t	2026-03-09 01:01:20.509308
4476	YKSN100	Ufaira Lathifah	f	3303044402150001	/uploads/YKSN100_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Ufaira Lathifah	Ufaira Lathifah	t	2026-03-09 01:01:20.509308
4477	YKSN267	Danang Noviyanto	t	3306101311930002	/uploads/YKSN267_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Danang noviyanto	Danang Noviyanto	t	2026-03-09 01:01:20.509308
4478	YKSN103	Megasari	t	3603236202820002	/uploads/YKSN103_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Megasari	Megasari	t	2026-03-09 01:01:20.509308
4479	YKSN103	Sulthan Ahmad Rafif	f	3603230402070004	/uploads/YKSN103_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Sulthan Ahmad Rafif	Sulthan Ahmad Rafif	t	2026-03-09 01:01:20.509308
4480	YKSN103	Mutiara Salsabilla	f	\N	/uploads/YKSN103_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Mutiara Salsabilla	Mutiara Salsabilla	t	2026-03-09 01:01:20.509308
4481	YKSN104	Suwardi	f	3172022702660008	/uploads/YKSN104_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Suwardi	Suwardi	t	2026-03-09 01:01:20.509308
4482	YKSN104	Mundari Yani	f	3172027112780028	/uploads/YKSN104_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Mundari yani	Mundari Yani	t	2026-03-09 01:01:20.509308
4483	YKSN104	Syarifudin Haris	f	3172021906980005	/uploads/YKSN104_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Syarifudin haris	Syarifudin Haris	t	2026-03-09 01:01:20.509308
4484	YKSN104	Abdul Rohman Azis	f	2172022206970017	/uploads/YKSN104_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Abdul Rohman Azis	Abdul Rohman Azis	t	2026-03-09 01:01:20.509308
4485	YKSN105	Muhammad Muchlis Zakki Anwar	t	3313150102000001	/uploads/YKSN105_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Muhammad Muchlis Zakki Anwar	Muhammad Muchlis Zakki Anwar	t	2026-03-09 01:01:20.509308
4486	YKSN308	Siswanto	f	3174102806740003	/uploads/YKSN308_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Siswanto	Siswanto	t	2026-03-09 01:01:20.509308
4487	YKSN309	Widiyatmoko	f	3216022806780007	/uploads/YKSN309_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	WIDIYATMOKO	Widiyatmoko	t	2026-03-09 01:01:20.509308
4488	YKSN309	Sularni	f	3313036104860002	/uploads/YKSN309_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	SULARNI	Sularni	t	2026-03-09 01:01:20.509308
4489	YKSN309	Desta Fathiril Haq	f	3216022412090008	/uploads/YKSN309_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	DESTA FATHIRIL HAQ	Desta Fathiril Haq	t	2026-03-09 01:01:20.509308
4490	YKSN309	Muhammad Nur Kholid	f	3216022709170004	/uploads/YKSN309_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	MUHAMMAD NUR KHOLID	Muhammad Nur Kholid	t	2026-03-09 01:01:20.509308
4491	YKSN107	Rina Puji Astuti	f	3309126002879004	/uploads/YKSN107_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Rina Puji Astuti	Rina Puji Astuti	t	2026-03-09 01:01:20.509308
4492	YKSN107	Shidqia Khaira Lubna	f	3314154308130001	/uploads/YKSN107_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Shidqia Khaira Lubna	Shidqia Khaira Lubna	t	2026-03-09 01:01:20.509308
4493	YKSN107	Ahmad Sakhi Zaidan	f	3314152307150001	/uploads/YKSN107_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Ahmad Sakhi Zaidan	Ahmad Sakhi Zaidan	t	2026-03-09 01:01:20.509308
4494	YKSN107	Hilya Ainuha Suraiya	f	3216074508180001	/uploads/YKSN107_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Hilya Ainuha Suraiya	Hilya Ainuha Suraiya	t	2026-03-09 01:01:20.509308
4496	YKSN108	Tisnoati	f	3215055401720001	/uploads/YKSN108_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Tisnoati	Tisnoati	t	2026-03-09 01:01:20.509308
4497	YKSN108	Akbar Tri Putranto	f	3215051409050007	/uploads/YKSN108_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Akbar Tri Putranto	Akbar Tri Putranto	t	2026-03-09 01:01:20.509308
4498	YKSN108	Fina Nailatul Izza	f	3215056001100005	/uploads/YKSN108_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Fina Nailatul Izza	Fina Nailatul Izza	t	2026-03-09 01:01:20.509308
4499	YKSN108	Lulu Kurniawan	f	3215052008980005	/uploads/YKSN108_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Lulu Kurniawan	Lulu Kurniawan	t	2026-03-09 01:01:20.509308
4500	YKSN109	Faza Faresha Affandi	t	3374130101030002	/uploads/YKSN109_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Faza Faresha Affandi	Faza Faresha Affandi	t	2026-03-09 01:01:20.509308
4501	YKSN110	A’an Destasa Ayurani	f	6271036112950009	/uploads/YKSN110_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	A’AN destasa Ayurani	A’an Destasa Ayurani	t	2026-03-09 01:01:20.509308
4517	YKSN115	Bagas Panji Utama	f	3276040808080001		f	\N	\N	2026-03-09 01:01:20.509308	3	Bagas panji utama	Bagas Panji Utama	t	2026-03-09 01:01:20.509308
4533	YKSN119	Barz Adieb	f	3175061206111006		f	\N	\N	2026-03-09 01:01:20.509308	4	BARZ ADIEB	Barz Adieb	t	2026-03-09 01:01:20.509308
4502	YKSN136	Samudi	t	3671010609740004	/uploads/YKSN136_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Samudi	Samudi	t	2026-03-09 01:01:20.509308
4503	YKSN136	Nurhayati	f	3671014410720001	/uploads/YKSN136_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Nurhayati	Nurhayati	t	2026-03-09 01:01:20.509308
4504	YKSN136	Yasyfiyani Syifa	f	3671016109020004	/uploads/YKSN136_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Yasyfiyani syifa	Yasyfiyani Syifa	t	2026-03-09 01:01:20.509308
4505	YKSN112	Riyanto	t	3175060903830024	/uploads/YKSN112_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Riyanto	Riyanto	t	2026-03-09 01:01:20.509308
4506	YKSN112	Muchamad Raihan Fatchul Riyadhi	f	3175063001090005	/uploads/YKSN112_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Muchamad Raihan Fatchul Riyadhi	Muchamad Raihan Fatchul Riyadhi	t	2026-03-09 01:01:20.509308
4507	YKSN112	Muchamad Raffa Nurridho Rosydhi	f	3175061005131013	/uploads/YKSN112_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Muchamad Raffa Nurridho Rosydhi	Muchamad Raffa Nurridho Rosydhi	t	2026-03-09 01:01:20.509308
4508	YKSN112	Siti Triayi Nurul Hidayah	f	3175064703790022	/uploads/YKSN112_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Siti Triayi Nurul Hidayah	Siti Triayi Nurul Hidayah	t	2026-03-09 01:01:20.509308
4509	YKSN113	Suroto	t	3216050603720005	/uploads/YKSN113_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Suroto	Suroto	t	2026-03-09 01:01:20.509308
4510	YKSN113	Nanik Suparni	f	3216056503720002	/uploads/YKSN113_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Nanik Suparni	Nanik Suparni	t	2026-03-09 01:01:20.509308
4511	YKSN113	Dyah Ayu Dewi Setyowati	f	3216054905040006	/uploads/YKSN113_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Dyah Ayu Dewi Setyowati	Dyah Ayu Dewi Setyowati	t	2026-03-09 01:01:20.509308
4512	YKSN113	Adellia Nur Azizah	f	3216054104130001	/uploads/YKSN113_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Adellia Nur Azizah	Adellia Nur Azizah	t	2026-03-09 01:01:20.509308
4513	YKSN114	Handoko	t	3309180401000002	/uploads/YKSN114_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	HANDOKO	Handoko	t	2026-03-09 01:01:20.509308
4514	YKSN114	Bonari	f	3174051212840025	/uploads/YKSN114_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	BONARI	Bonari	t	2026-03-09 01:01:20.509308
4515	YKSN115	Sarno Harianto	f	3276091806790001	/uploads/YKSN115_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Sarno harianto	Sarno Harianto	t	2026-03-09 01:01:20.509308
4516	YKSN115	Suyani	f	3276046406880011	/uploads/YKSN115_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Suyani	Suyani	t	2026-03-09 01:01:20.509308
4518	YKSN115	Farid Rizki Saputra	f	3276030601180001	/uploads/YKSN115_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Farid rizki saputra	Farid Rizki Saputra	t	2026-03-09 01:01:20.509308
4519	YKSN116	Adhi Supriyanto	f	3276041204890005	/uploads/YKSN116_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Adhi supriyanto	Adhi Supriyanto	t	2026-03-09 01:01:20.509308
4520	YKSN116	Raniati	f	3301155911900003	/uploads/YKSN116_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Raniati	Raniati	t	2026-03-09 01:01:20.509308
4521	YKSN116	Fardan Aditama Prasetyo	f	3276031308160001	/uploads/YKSN116_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Fardan aditama prasetyo	Fardan Aditama Prasetyo	t	2026-03-09 01:01:20.509308
4522	YKSN117	Hadhika Afghani Imansyah	t	3174090703010003	/uploads/YKSN117_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Hadhika Afghani Imansyah	Hadhika Afghani Imansyah	t	2026-03-09 01:01:20.509308
4523	YKSN117	Sumanto	f	3174090109710003	/uploads/YKSN117_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Sumanto	Sumanto	t	2026-03-09 01:01:20.509308
4524	YKSN117	Sularti	f	3174097008750004	/uploads/YKSN117_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Sularti	Sularti	t	2026-03-09 01:01:20.509308
4525	YKSN117	Havinta Cleriza Latifani	f	3174094305091004	/uploads/YKSN117_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Havinta Cleriza Latifani	Havinta Cleriza Latifani	t	2026-03-09 01:01:20.509308
4526	YKSN118	Sutaryo	t	3216211501850010	/uploads/YKSN118_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	SUTARYO	Sutaryo	t	2026-03-09 01:01:20.509308
4527	YKSN118	Sriyatun	f	3311065208820003	/uploads/YKSN118_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	SRIYATUN	Sriyatun	t	2026-03-09 01:01:20.509308
4528	YKSN118	Rizcardo Yossa Syahputra	f	3275011807070004	/uploads/YKSN118_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	RIZCARDO YOSSA SYAHPUTRA	Rizcardo Yossa Syahputra	t	2026-03-09 01:01:20.509308
4529	YKSN118	Meysha Anndara Syahputri	f	3275014105150006	/uploads/YKSN118_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	MEYSHA ANNDARA SYAHPUTRI	Meysha Anndara Syahputri	t	2026-03-09 01:01:20.509308
4530	YKSN119	Agus Ahmad Faisal	t	3312102008950001	/uploads/YKSN119_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Agus Ahmad Faisal	Agus Ahmad Faisal	t	2026-03-09 01:01:20.509308
4531	YKSN119	Widodo	f	3312101910670001	/uploads/YKSN119_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Widodo	Widodo	t	2026-03-09 01:01:20.509308
4532	YKSN119	Kusrini	f	3175024806850009	/uploads/YKSN119_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Kusrini	Kusrini	t	2026-03-09 01:01:20.509308
4534	YKSN120	Sukarno	t	3174090305720013	/uploads/YKSN120_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Sukarno	Sukarno	t	2026-03-09 01:01:20.509308
4535	YKSN120	Yulia Damayanti	f	3215055707760005	/uploads/YKSN120_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Yulia Damayanti	Yulia Damayanti	t	2026-03-09 01:01:20.509308
4536	YKSN120	Rizki Akbar Taufiqi	f	3174092706131008	/uploads/YKSN120_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Rizki akbar Taufiqi	Rizki Akbar Taufiqi	t	2026-03-09 01:01:20.509308
4537	YKSN120	M Aris Maulana	f	3174090807170001	/uploads/YKSN120_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	M Aris maulana	M Aris Maulana	t	2026-03-09 01:01:20.509308
4538	YKSN121	Rian Abi Romadhon	t	3501030601980003	/uploads/YKSN121_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Rian Abi Romadhon	Rian Abi Romadhon	t	2026-03-09 01:01:20.509308
4539	YKSN121	Ardi	f	3501030501080001	/uploads/YKSN121_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Ardi	Ardi	t	2026-03-09 01:01:20.509308
4540	YKSN121	Arif Kristianto	f	3501030507930001	/uploads/YKSN121_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Arif Kristianto	Arif Kristianto	t	2026-03-09 01:01:20.509308
4542	YKSN122	Arif Mahmudi	t	3175011812900005	/uploads/YKSN122_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Arif Mahmudi	Arif Mahmudi	t	2026-03-09 01:01:20.509308
4543	YKSN122	Djumadi	f	3175010302670005	/uploads/YKSN122_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Djumadi	Djumadi	t	2026-03-09 01:01:20.509308
4544	YKSN122	Mutrini	f	3175016911700005	/uploads/YKSN122_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Mutrini	Mutrini	t	2026-03-09 01:01:20.509308
4545	YKSN122	Hendri Prasetyo	f	3175011407980002	/uploads/YKSN122_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Hendri prasetyo	Hendri Prasetyo	t	2026-03-09 01:01:20.509308
4546	YKSN123	Faiz Balya Marwan	t	3325051101940001	/uploads/YKSN123_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Faiz Balya Marwan	Faiz Balya Marwan	t	2026-03-09 01:01:20.509308
4547	YKSN123	Zulfa Amalia	f	3313095504950001	/uploads/YKSN123_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Zulfa Amalia	Zulfa Amalia	t	2026-03-09 01:01:20.509308
4548	YKSN123	Muhammad Kamil	f	3325050709220002	/uploads/YKSN123_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Muhammad Kamil	Muhammad Kamil	t	2026-03-09 01:01:20.509308
4549	YKSN123	Tsaqif Nadir	f	3325052103250001	/uploads/YKSN123_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Tsaqif Nadir	Tsaqif Nadir	t	2026-03-09 01:01:20.509308
4550	YKSN124	Tri Wahono	t	3205302708780003	/uploads/YKSN124_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Tri Wahono	Tri Wahono	t	2026-03-09 01:01:20.509308
4551	YKSN124	Siti Maryam	f	3205304101870013	/uploads/YKSN124_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Siti Maryam	Siti Maryam	t	2026-03-09 01:01:20.509308
4552	YKSN124	Aditya Putra Wahono	f	3205302601100003	/uploads/YKSN124_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Aditya Putra Wahono	Aditya Putra Wahono	t	2026-03-09 01:01:20.509308
4553	YKSN125	Nurul Hasanah	t	3174055301900007	/uploads/YKSN125_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Nurul Hasanah	Nurul Hasanah	t	2026-03-09 01:01:20.509308
4554	YKSN125	Muhamad Albiansyah	f	3171070202121003	/uploads/YKSN125_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Muhamad albiansyah	Muhamad Albiansyah	t	2026-03-09 01:01:20.509308
4555	YKSN125	Aulian Kasyavani Filardha	f	3176080411180003	/uploads/YKSN125_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Aulian kasyavani filardha	Aulian Kasyavani Filardha	t	2026-03-09 01:01:20.509308
4556	YKSN125	Arrasya Brian Radeva	f	3316121304220004	/uploads/YKSN125_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Arrasya Brian Radeva	Arrasya Brian Radeva	t	2026-03-09 01:01:20.509308
4557	YKSN127	Randika Yanseta	t	3372011908920001	/uploads/YKSN127_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Randika Yanseta	Randika Yanseta	t	2026-03-09 01:01:20.509308
4558	YKSN128	Arizqi Nurhamsyah	t	3520071101930001	/uploads/YKSN128_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Arizqi Nurhamsyah	Arizqi Nurhamsyah	t	2026-03-09 01:01:20.509308
4559	YKSN128	Virasti Sunayah	f	3520074711960001	/uploads/YKSN128_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Virasti Sunayah	Virasti Sunayah	t	2026-03-09 01:01:20.509308
4560	YKSN129	Ahmad Saeful Amri	f	3173041803860004	/uploads/YKSN129_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ahmad saeful amri	Ahmad Saeful Amri	t	2026-03-09 01:01:20.509308
4561	YKSN129	Susanti	f	3312155405880001	/uploads/YKSN129_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Susanti	Susanti	t	2026-03-09 01:01:20.509308
4562	YKSN129	Bayezid Alfatih	f	3173040509220005	/uploads/YKSN129_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Bayezid alfatih	Bayezid Alfatih	t	2026-03-09 01:01:20.509308
4563	YKSN130	Aan Sarnianto	t	3174061204760010	/uploads/YKSN130_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Aan sarnianto	Aan Sarnianto	t	2026-03-09 01:01:20.509308
4564	YKSN130	Marsinah	f	3174066203830003	/uploads/YKSN130_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Marsinah	Marsinah	t	2026-03-09 01:01:20.509308
4565	YKSN130	Arya Surya Saputra	f	3174062702070004	/uploads/YKSN130_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Arya surya saputra	Arya Surya Saputra	t	2026-03-09 01:01:20.509308
4566	YKSN130	Sarah Aulia Putri	f	3174065301141001	/uploads/YKSN130_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Sarah aulia putri	Sarah Aulia Putri	t	2026-03-09 01:01:20.509308
4567	YKSN131	Muhamad Nur Arief	t	3312230207000001	/uploads/YKSN131_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Muhamad nur arief	Muhamad Nur Arief	t	2026-03-09 01:01:20.509308
4568	YKSN131	Retno Sri Mulatsih	f	3312235103960001	/uploads/YKSN131_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Retno sri mulatsih	Retno Sri Mulatsih	t	2026-03-09 01:01:20.509308
4569	YKSN131	Valerie Areta Maheswari	f	3312235902210002	/uploads/YKSN131_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Valerie areta maheswari	Valerie Areta Maheswari	t	2026-03-09 01:01:20.509308
4570	YKSN131	Chareyssa Sean Prameswari	f	3312235709230001	/uploads/YKSN131_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Chareyssa sean prameswari	Chareyssa Sean Prameswari	t	2026-03-09 01:01:20.509308
4571	YKSN132	Nuryani	t	11350002578	/uploads/YKSN132_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Nuryani	Nuryani	t	2026-03-09 01:01:20.509308
4572	YKSN132	Krisna	f	113500000000	/uploads/YKSN132_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Krisna	Krisna	t	2026-03-09 01:01:20.509308
4573	YKSN133	Warjo	f	3671110905620001	/uploads/YKSN133_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Warjo	Warjo	t	2026-03-09 01:01:20.509308
4575	YKSN094	Undang Minarti	f	3403106307880003	/uploads/YKSN094_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Undang minarti	Undang Minarti	t	2026-03-09 01:01:20.509308
4576	YKSN094	Andrian Zaky Alfarezi	f	3403102012180001	/uploads/YKSN094_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Andrian Zaky Alfarezi	Andrian Zaky Alfarezi	t	2026-03-09 01:01:20.509308
4577	YKSN134	Didik Prasetyo Saputro	t	3276100908970003	/uploads/YKSN134_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Didik Prasetyo saputro	Didik Prasetyo Saputro	t	2026-03-09 01:01:20.509308
4578	YKSN134	Tasya Septiyas	f	3901125709000001	/uploads/YKSN134_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	tasya septiyas	Tasya Septiyas	t	2026-03-09 01:01:20.509308
4579	YKSN134	Suparni	f	3276062006840008	/uploads/YKSN134_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	suparni	Suparni	t	2026-03-09 01:01:20.509308
4574	YKSN133	Ahmad Dwiantoro	f	3671112611000001	/uploads/YKSN133_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Ahmad Dwiantoro	Ahmad Dwiantoro	t	2026-03-09 01:01:20.509308
4581	YKSN303	Arum Zain	f	3175085005051003	/uploads/YKSN303_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Arum Zain	Arum Zain	t	2026-03-09 01:01:20.509308
4582	YKSN135	Tri Hariadi	t	3175092906840014	/uploads/YKSN135_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Tri Hariadi	Tri Hariadi	t	2026-03-09 01:01:20.509308
4583	YKSN135	Evi Suryani	f	3312045410840001	/uploads/YKSN135_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Evi Suryani	Evi Suryani	t	2026-03-09 01:01:20.509308
4584	YKSN135	Baiza Eraj Almira	f	3312034606120004	/uploads/YKSN135_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Baiza Eraj Almira	Baiza Eraj Almira	t	2026-03-09 01:01:20.509308
4585	YKSN135	Fattan Eraj Alkhalifa	f	3312032901180002	/uploads/YKSN135_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Fattan Eraj Alkhalifa	Fattan Eraj Alkhalifa	t	2026-03-09 01:01:20.509308
4586	YKSN111	Sugiyanto	t	3175061112770021	/uploads/YKSN111_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Sugiyanto	Sugiyanto	t	2026-03-09 01:01:20.509308
4587	YKSN111	Suparmi	f	3175064705760024	/uploads/YKSN111_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Suparmi	Suparmi	t	2026-03-09 01:01:20.509308
4588	YKSN111	Alvin Arifianto	f	3175061408040013	/uploads/YKSN111_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Alvin Arifianto	Alvin Arifianto	t	2026-03-09 01:01:20.509308
4589	YKSN138	Wahyudi	t	3314140708850001	/uploads/YKSN138_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Wahyudi	Wahyudi	t	2026-03-09 01:01:20.509308
4590	YKSN138	Nona Nastalgia	f	1305064111960002	/uploads/YKSN138_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Nona nastalgia	Nona Nastalgia	t	2026-03-09 01:01:20.509308
4591	YKSN138	Ayana Izma Fakhirah	f	3172034301210003	/uploads/YKSN138_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Ayana izma fakhirah	Ayana Izma Fakhirah	t	2026-03-09 01:01:20.509308
4592	YKSN138	Riri Anjali	f	1305064204030002	/uploads/YKSN138_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Riri anjali	Riri Anjali	t	2026-03-09 01:01:20.509308
4593	YKSN139	Supriyono	t	3671010708800007	/uploads/YKSN139_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Supriyono	Supriyono	t	2026-03-09 01:01:20.509308
4594	YKSN139	Hasti Desviyanti	f	3671016612880002	/uploads/YKSN139_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Hasti Desviyanti	Hasti Desviyanti	t	2026-03-09 01:01:20.509308
4595	YKSN139	Shaqilla Haspry Fashabila	f	3671016001090001	/uploads/YKSN139_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Shaqilla Haspry Fashabila	Shaqilla Haspry Fashabila	t	2026-03-09 01:01:20.509308
4596	YKSN139	Syaafil Haspry Nababil	f	3671010511120002	/uploads/YKSN139_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Syaafil Haspry Nababil	Syaafil Haspry Nababil	t	2026-03-09 01:01:20.509308
4597	YKSN140	Tri Prasetyo	t	3309182110980004	/uploads/YKSN140_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Tri prasetyo	Tri Prasetyo	t	2026-03-09 01:01:20.509308
4598	YKSN140	Sri Suci Mulyani	f	3309146908900002	/uploads/YKSN140_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Sri suci mulyani	Sri Suci Mulyani	t	2026-03-09 01:01:20.509308
4599	YKSN140	Marvin Dzeko Alvaro	f	3309140907110002	/uploads/YKSN140_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Marvin dzeko alvaro	Marvin Dzeko Alvaro	t	2026-03-09 01:01:20.509308
4600	YKSN140	Maira Zahida Alvira	f	3171076402200001	/uploads/YKSN140_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Maira zahida alvira	Maira Zahida Alvira	t	2026-03-09 01:01:20.509308
4601	YKSN141	Ilham Setya Pratama	t	3311042402020008	/uploads/YKSN141_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	ILHAM SETYA PRATAMA	Ilham Setya Pratama	t	2026-03-09 01:01:20.509308
4602	YKSN142	Muhammad Adirisky	t	3314080306050003	/uploads/YKSN142_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	muhammad adirisky	Muhammad Adirisky	t	2026-03-09 01:01:20.509308
4603	YKSN143	Chairullatif Aji Sadewa	t	3312121405010004	/uploads/YKSN143_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Chairullatif Aji Sadewa	Chairullatif Aji Sadewa	t	2026-03-09 01:01:20.509308
4604	YKSN144	Muhammad Yusuf	t	3312211907980001	/uploads/YKSN144_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Muhammad Yusuf	Muhammad Yusuf	t	2026-03-09 01:01:20.509308
4605	YKSN144	Jaza Ul Aufa	f	3574046605000002	/uploads/YKSN144_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Jaza Ul Aufa	Jaza Ul Aufa	t	2026-03-09 01:01:20.509308
4606	YKSN144	Mayza Azkia Humaira	f	3312214611230001	/uploads/YKSN144_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Mayza Azkia Humaira	Mayza Azkia Humaira	t	2026-03-09 01:01:20.509308
4607	YKSN145	Komarudin Bahri	t	3671052406910005	/uploads/YKSN145_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Komarudin Bahri	Komarudin Bahri	t	2026-03-09 01:01:20.509308
4608	YKSN145	Daffa Mirza Ukail	f	3671051302130005	/uploads/YKSN145_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Daffa Mirza Ukail	Daffa Mirza Ukail	t	2026-03-09 01:01:20.509308
4609	YKSN145	Izaan Umar Al Fatih	f	3671052407190001	/uploads/YKSN145_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Izaan Umar Al Fatih	Izaan Umar Al Fatih	t	2026-03-09 01:01:20.509308
4610	YKSN146	Sarman	f	3175091604650006	/uploads/YKSN146_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Sarman	Sarman	t	2026-03-09 01:01:20.509308
4611	YKSN147	Alma Dewi Ananda	t	3312076204010001	/uploads/YKSN147_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Alma Dewi Ananda	Alma Dewi Ananda	t	2026-03-09 01:01:20.509308
4612	YKSN148	Ali Sholeh	t	3172010705790012	/uploads/YKSN148_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ali sholeh	Ali Sholeh	t	2026-03-09 01:01:20.509308
4613	YKSN148	Awallia Rezana	f	3172015207041003	/uploads/YKSN148_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Awallia rezana	Awallia Rezana	t	2026-03-09 01:01:20.509308
4614	YKSN149	Siswanto	t	3501036808970002	/uploads/YKSN149_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Siswanto	Siswanto	t	2026-03-09 01:01:20.509308
4615	YKSN149	Dhea Karina	f	3201015212020005	/uploads/YKSN149_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Dhea karina	Dhea Karina	t	2026-03-09 01:01:20.509308
4616	YKSN149	Karel Azver Xavier Rizki	f	3276101805220008	/uploads/YKSN149_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Karel azver Xavier rizki	Karel Azver Xavier Rizki	t	2026-03-09 01:01:20.509308
4617	YKSN150	Adi Junaidi	f	1802162712930001	/uploads/YKSN150_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	ADI JUNAIDI	Adi Junaidi	t	2026-03-09 01:01:20.509308
4618	YKSN150	Septias Eka Safitri	f	3501014409970002	/uploads/YKSN150_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	SEPTIAS EKA SAFITRI	Septias Eka Safitri	t	2026-03-09 01:01:20.509308
4623	YKSN151	Dedi Supriyanto	f	3312130612890004		f	\N	\N	2026-03-09 01:01:20.509308	2	Dedi Supriyanto	Dedi Supriyanto	t	2026-03-09 01:01:20.509308
4624	YKSN151	Devina Eka Lestar	f	3518045612170001		f	\N	\N	2026-03-09 01:01:20.509308	3	Devina Eka Lestar	Devina Eka Lestar	t	2026-03-09 01:01:20.509308
4625	YKSN151	Enik Ernawati	f	3518046901900003		f	\N	\N	2026-03-09 01:01:20.509308	4	Enik Ernawati	Enik Ernawati	t	2026-03-09 01:01:20.509308
4620	YKSN150	Devina Maharani	f	3501034702050001	/uploads/YKSN150_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	DEVINA MAHARANI	Devina Maharani	t	2026-03-09 01:01:20.509308
4621	YKSN304	Gebrila Aulia Kharomah	f	3501047006040006	/uploads/YKSN304_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Gebrila Aulia Kharomah	Gebrila Aulia Kharomah	t	2026-03-09 01:01:20.509308
4622	YKSN151	Artha Prandikatama	t	3312030904900001	/uploads/YKSN151_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Artha prandikatama	Artha Prandikatama	t	2026-03-09 01:01:20.509308
4626	YKSN152	Arifudin	t	3209022106890003	/uploads/YKSN152_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	ARIFUDIN	Arifudin	t	2026-03-09 01:01:20.509308
4627	YKSN153	Muhammad Ahsin Fahmi	t	3175101502940007	/uploads/YKSN153_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	MUHAMMAD AHSIN FAHMI	Muhammad Ahsin Fahmi	t	2026-03-09 01:01:20.509308
4628	YKSN153	Aris Susanti	f	3302156904960003	/uploads/YKSN153_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	ARIS SUSANTI	Aris Susanti	t	2026-03-09 01:01:20.509308
4629	YKSN153	Lunayra Elkiran	f	3175104305180005	/uploads/YKSN153_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	LUNAYRA ELKIRAN	Lunayra Elkiran	t	2026-03-09 01:01:20.509308
4630	YKSN153	Leonza Ryugala Elzayn	f	3175100911240003	/uploads/YKSN153_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	LEONZA RYUGALA ELZAYN	Leonza Ryugala Elzayn	t	2026-03-09 01:01:20.509308
4631	YKSN154	Drajat Jiwandono	t	3303153010920001	/uploads/YKSN154_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Drajat Jiwandono	Drajat Jiwandono	t	2026-03-09 01:01:20.509308
4632	YKSN154	Laksmi Fakhrunnisa	f	3303064705930001	/uploads/YKSN154_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Laksmi Fakhrunnisa	Laksmi Fakhrunnisa	t	2026-03-09 01:01:20.509308
4633	YKSN154	Aqila Nayyira Jiwandono	f	3303064802180001	/uploads/YKSN154_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Aqila Nayyira Jiwandono	Aqila Nayyira Jiwandono	t	2026-03-09 01:01:20.509308
4634	YKSN154	Aqifa Assyifa Jiwandono	f	3303064209200001	/uploads/YKSN154_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Aqifa Assyifa Jiwandono	Aqifa Assyifa Jiwandono	t	2026-03-09 01:01:20.509308
4635	YKSN155	Opiyana	t	3302202810910004	/uploads/YKSN155_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Opiyana	Opiyana	t	2026-03-09 01:01:20.509308
4636	YKSN155	Bagas Dwi Faldianto	f	3303080207030004	/uploads/YKSN155_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Bagas dwi faldianto	Bagas Dwi Faldianto	t	2026-03-09 01:01:20.509308
4637	YKSN155	Dika Saputra Priadi	f	3303082910040002	/uploads/YKSN155_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Dika saputra priadi	Dika Saputra Priadi	t	2026-03-09 01:01:20.509308
4638	YKSN155	Rasean	f	3326113011870001	/uploads/YKSN155_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Rasean	Rasean	t	2026-03-09 01:01:20.509308
4639	YKSN156	Hendro Dwijo Ratmoko	t	3301022306860003	/uploads/YKSN156_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Hendro dwijo ratmoko	Hendro Dwijo Ratmoko	t	2026-03-09 01:01:20.509308
4640	YKSN157	Arief Hendratno	t	3173080701710001	/uploads/YKSN157_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Arief Hendratno	Arief Hendratno	t	2026-03-09 01:01:20.509308
4641	YKSN157	Geehan Arno Mukti	f	3173081807020003	/uploads/YKSN157_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Geehan Arno Mukti	Geehan Arno Mukti	t	2026-03-09 01:01:20.509308
4642	YKSN158	Arief Triwidodo	f	3215032005730004	/uploads/YKSN158_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Arief Triwidodo	Arief Triwidodo	t	2026-03-09 01:01:20.509308
4643	YKSN158	Muyasyaroh	f	3215034101760006	/uploads/YKSN158_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Muyasyaroh	Muyasyaroh	t	2026-03-09 01:01:20.509308
4644	YKSN158	Kayla Anistia Alika	f	3215037004040006	/uploads/YKSN158_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Kayla Anistia Alika	Kayla Anistia Alika	t	2026-03-09 01:01:20.509308
4645	YKSN296	Nabilla Alya Ramadhani	f	3175035910050006	/uploads/YKSN296_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Nabilla Alya Ramadhani	Nabilla Alya Ramadhani	t	2026-03-09 01:01:20.509308
4646	YKSN296	Rasyid Arya Maulana	f	3671131601130001	/uploads/YKSN296_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Rasyid Arya Maulana	Rasyid Arya Maulana	t	2026-03-09 01:01:20.509308
4647	YKSN159	Puji Astuti	t	3302026703810001	/uploads/YKSN159_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Puji astuti	Puji Astuti	t	2026-03-09 01:01:20.509308
4648	YKSN159	Sumitro	f	3302012305760001	/uploads/YKSN159_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Sumitro	Sumitro	t	2026-03-09 01:01:20.509308
4649	YKSN159	Muhammad Azriel Alfariq	f	3302021807170003	/uploads/YKSN159_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Muhammad Azriel alfariq	Muhammad Azriel Alfariq	t	2026-03-09 01:01:20.509308
4650	YKSN160	Sekar Arini Damayanti	t	3302265803010001	/uploads/YKSN160_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Sekar Arini Damayanti	Sekar Arini Damayanti	t	2026-03-09 01:01:20.509308
4651	YKSN161	Rangga Firdauz Mahatma Jaladara	t	3302241302020003	/uploads/YKSN161_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	rangga firdauz mahatma jaladara	Rangga Firdauz Mahatma Jaladara	t	2026-03-09 01:01:20.509308
4652	YKSN162	Nafilatunnisa	t	3302146104020001	/uploads/YKSN162_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Nafilatunnisa	Nafilatunnisa	t	2026-03-09 01:01:20.509308
4653	YKSN163	Catim	t	3302142511670002	/uploads/YKSN163_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Catim	Catim	t	2026-03-09 01:01:20.509308
4654	YKSN164	Agus Sukma Sejati	t	3302203008960002	/uploads/YKSN164_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Agus Sukma sejati	Agus Sukma Sejati	t	2026-03-09 01:01:20.509308
4655	YKSN164	Dwi Marsuristio	f	3171045703960002	/uploads/YKSN164_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Dwi marsuristio	Dwi Marsuristio	t	2026-03-09 01:01:20.509308
4656	YKSN165	Dimas Saputra	t	3303121909960002	/uploads/YKSN165_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Dimas Saputra	Dimas Saputra	t	2026-03-09 01:01:20.509308
4657	YKSN166	Edi Santoso	f	3329032011850005	/uploads/YKSN166_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Edi Santoso	Edi Santoso	t	2026-03-09 01:01:20.509308
4659	YKSN177	Siti Muntingah	t	3173015905780008	/uploads/YKSN177_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Siti muntingah	Siti Muntingah	t	2026-03-09 01:01:20.509308
4660	YKSN177	Sugiman	f	3306110609600004	/uploads/YKSN177_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Sugiman	Sugiman	t	2026-03-09 01:01:20.509308
4661	YKSN177	Fadhil Asrofi	f	3173010306101015	/uploads/YKSN177_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Fadhil asrofi	Fadhil Asrofi	t	2026-03-09 01:01:20.509308
4662	YKSN167	Fani Dipta Palguna	t	3305201312030001	/uploads/YKSN167_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Fani Dipta Palguna	Fani Dipta Palguna	t	2026-03-09 01:01:20.509308
4663	YKSN168	Dini Prihatiningsih	t	3305116812960001	/uploads/YKSN168_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Dini Prihatiningsih	Dini Prihatiningsih	t	2026-03-09 01:01:20.509308
4664	YKSN169	Sarmin	t	3173060202700005	/uploads/YKSN169_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Sarmin	Sarmin	t	2026-03-09 01:01:20.509308
4665	YKSN170	Darsono	t	3201061504700008	/uploads/YKSN170_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Darsono	Darsono	t	2026-03-09 01:01:20.509308
4666	YKSN172	Nanang Hernawan	t	3312111604820001	/uploads/YKSN172_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Nanang Hernawan	Nanang Hernawan	t	2026-03-09 01:01:20.509308
4667	YKSN172	Fera Armila	f	1671066302880008	/uploads/YKSN172_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Fera Armila	Fera Armila	t	2026-03-09 01:01:20.509308
4668	YKSN172	Shakila Sesha Hernawan	f	1671065708140003	/uploads/YKSN172_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Shakila Sesha Hernawan	Shakila Sesha Hernawan	t	2026-03-09 01:01:20.509308
4669	YKSN172	Tsabita Azima Hernawan	f	1671065309150002	/uploads/YKSN172_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Tsabita Azima Hernawan	Tsabita Azima Hernawan	t	2026-03-09 01:01:20.509308
4670	YKSN173	Muhammad Kharis Maulana	t	3402150206990001	/uploads/YKSN173_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Muhammad Kharis Maulana	Muhammad Kharis Maulana	t	2026-03-09 01:01:20.509308
4671	YKSN317	Eko Prayudi	f	3501081210940003	/uploads/YKSN317_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Eko prayudi	Eko Prayudi	t	2026-03-09 01:01:20.509308
4672	YKSN317	Yuyun	f	3201174605970004	/uploads/YKSN317_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Yuyun	Yuyun	t	2026-03-09 01:01:20.509308
4673	YKSN317	Carissa Irena Syabila	f	3275126512180004	/uploads/YKSN317_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	CARISSA IRENA SYABILA	Carissa Irena Syabila	t	2026-03-09 01:01:20.509308
4674	YKSN318	Mismini	f	3501036604450001	/uploads/YKSN318_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Mismini	Mismini	t	2026-03-09 01:01:20.509308
4675	YKSN174	Muhammad Zaenudin Azis	t	3209172309910005	/uploads/YKSN174_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	MUHAMMAD ZAENUDIN AZIS	Muhammad Zaenudin Azis	t	2026-03-09 01:01:20.509308
4676	YKSN174	Rina Karlina	f	3206296509940001	/uploads/YKSN174_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Rina karlina	Rina Karlina	t	2026-03-09 01:01:20.509308
4677	YKSN174	Alisa Arsylia	f	3206292309150001	/uploads/YKSN174_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	ALISA ARSYLIA	Alisa Arsylia	t	2026-03-09 01:01:20.509308
4678	YKSN174	Hani Febriani	f	3206294802150001	/uploads/YKSN174_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	HANI FEBRIANI	Hani Febriani	t	2026-03-09 01:01:20.509308
4679	YKSN302	Tasirih	f	3209284302710005	/uploads/YKSN302_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Tasirih	Tasirih	t	2026-03-09 01:01:20.509308
4680	YKSN175	Esta Maulida Fatha	f	3320135908940002	/uploads/YKSN175_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Esta Maulida Fatha	Esta Maulida Fatha	t	2026-03-09 01:01:20.509308
4681	YKSN176	Taslim Hadi	t	1806151502000004	/uploads/YKSN176_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Taslim Hadi	Taslim Hadi	t	2026-03-09 01:01:20.509308
4682	YKSN176	Uswatun Khasanah	f	3329087009040003	/uploads/YKSN176_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Uswatun khasanah	Uswatun Khasanah	t	2026-03-09 01:01:20.509308
4683	YKSN176	M.arshaka Hadi	f	3329082001240001	/uploads/YKSN176_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	M.Arshaka Hadi	M.arshaka Hadi	t	2026-03-09 01:01:20.509308
4684	YKSN178	Turyono	t	3305262704820003	/uploads/YKSN178_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Turyono	Turyono	t	2026-03-09 01:01:20.509308
4685	YKSN178	Yeni	f	3305266605870002	/uploads/YKSN178_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Yeni	Yeni	t	2026-03-09 01:01:20.509308
4686	YKSN178	Yoni Makaila Bilfaqih	f	3305266603100001	/uploads/YKSN178_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Yoni makaila bilfaqih	Yoni Makaila Bilfaqih	t	2026-03-09 01:01:20.509308
4687	YKSN178	Banyu Embun Panggalih	f	3174076809200004	/uploads/YKSN178_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Banyu Embun Panggalih	Banyu Embun Panggalih	t	2026-03-09 01:01:20.509308
4688	YKSN179	Dian Dwi Saputra	t	3403101609000001	/uploads/YKSN179_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	DIAN DWI SAPUTRA	Dian Dwi Saputra	t	2026-03-09 01:01:20.509308
4689	YKSN179	Putri Anggraeni Subekti	f	3276034204020008	/uploads/YKSN179_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	PUTRI ANGGRAENI SUBEKTI	Putri Anggraeni Subekti	t	2026-03-09 01:01:20.509308
4690	YKSN179	Hayden Rafqi Alfarezi	f	3403102903220001	/uploads/YKSN179_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	HAYDEN RAFQI ALFAREZI	Hayden Rafqi Alfarezi	t	2026-03-09 01:01:20.509308
4691	YKSN180	Cecep Mulyadi	t	3175082903760008	/uploads/YKSN180_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Cecep Mulyadi	Cecep Mulyadi	t	2026-03-09 01:01:20.509308
4692	YKSN182	Miladiyatu Tsania Zulfa	t	3310195505010004	/uploads/YKSN182_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Miladiyatu Tsania Zulfa	Miladiyatu Tsania Zulfa	t	2026-03-09 01:01:20.509308
4693	YKSN183	Ridwan Putra Permana	t	3311061210950001	/uploads/YKSN183_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ridwan putra permana	Ridwan Putra Permana	t	2026-03-09 01:01:20.509308
4694	YKSN184	Dwi Puspitasari	t	3521065010930002	/uploads/YKSN184_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Dwi Puspitasari	Dwi Puspitasari	t	2026-03-09 01:01:20.509308
4695	YKSN185	Wahidya Difta Sunanda	t	3502020610960001	/uploads/YKSN185_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Wahidya Difta Sunanda	Wahidya Difta Sunanda	t	2026-03-09 01:01:20.509308
4696	YKSN185	Shafia Aqla Dzakia	f	3404126303980003	/uploads/YKSN185_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Shafia Aqla Dzakia	Shafia Aqla Dzakia	t	2026-03-09 01:01:20.509308
4710	YKSN190	Rizqi Ali Zundiansyah	f	3604200905100002		f	\N	\N	2026-03-09 01:01:20.509308	3	Rizqi ali zundiansyah	Rizqi Ali Zundiansyah	t	2026-03-09 01:01:20.509308
4711	YKSN190	Adiba Shakila Putri	f	3604206408160003		f	\N	\N	2026-03-09 01:01:20.509308	4	Adiba shakila putri	Adiba Shakila Putri	t	2026-03-09 01:01:20.509308
4698	YKSN186	Maningsih	f	3276104607850004	/uploads/YKSN186_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Maningsih	Maningsih	t	2026-03-09 01:01:20.509308
4699	YKSN187	Suyatno	f	3521110404830005	/uploads/YKSN187_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Suyatno	Suyatno	t	2026-03-09 01:01:20.509308
4700	YKSN187	Sukarti	f	3521125504870001	/uploads/YKSN187_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Sukarti	Sukarti	t	2026-03-09 01:01:20.509308
4701	YKSN187	Tasya Puspitaningtias	f	3521124308060001	/uploads/YKSN187_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Tasya puspitaningtias	Tasya Puspitaningtias	t	2026-03-09 01:01:20.509308
4702	YKSN187	Alvian Yoga Ramadhan	f	3521122307120003	/uploads/YKSN187_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Alvian yoga ramadhan	Alvian Yoga Ramadhan	t	2026-03-09 01:01:20.509308
4703	YKSN188	Siswanto	f	3175101412820006	/uploads/YKSN188_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Siswanto	Siswanto	t	2026-03-09 01:01:20.509308
4704	YKSN188	Vazari Asrofah	f	3175104311870007	/uploads/YKSN188_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Vazari asrofah	Vazari Asrofah	t	2026-03-09 01:01:20.509308
4705	YKSN188	Fabian Setiawan	f	3175102508071001	/uploads/YKSN188_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Fabian setiawan	Fabian Setiawan	t	2026-03-09 01:01:20.509308
4706	YKSN188	Ari Afif Asrorie	f	3175101202141009	/uploads/YKSN188_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Ari afif asrorie	Ari Afif Asrorie	t	2026-03-09 01:01:20.509308
4707	YKSN189	Rusminiati	f	3521065308720002	/uploads/YKSN189_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Rusminiati	Rusminiati	t	2026-03-09 01:01:20.509308
4708	YKSN190	Ali Shodikin	f	3671010405830009	/uploads/YKSN190_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ali shodikin	Ali Shodikin	t	2026-03-09 01:01:20.509308
4709	YKSN190	Sahyati	f	3604206501880001	/uploads/YKSN190_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Sahyati	Sahyati	t	2026-03-09 01:01:20.509308
4712	YKSN191	Lukman Azis	t	7371091308840003	/uploads/YKSN191_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Lukman Azis	Lukman Azis	t	2026-03-09 01:01:20.509308
4713	YKSN298	Nanang Priyambodo	f	3515181904820007	/uploads/YKSN298_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Nanang Priyambodo	Nanang Priyambodo	t	2026-03-09 01:01:20.509308
4714	YKSN298	Rizqi Amaliyah	f	3515184307820005	/uploads/YKSN298_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Rizqi Amaliyah	Rizqi Amaliyah	t	2026-03-09 01:01:20.509308
4715	YKSN298	Hafidz Ash Shiddiqi Priambodo	f	3515180209080008	/uploads/YKSN298_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Hafidz ash shiddiqi Priambodo	Hafidz Ash Shiddiqi Priambodo	t	2026-03-09 01:01:20.509308
4716	YKSN298	Faiza Ashalina Priambodo	f	3515185711140002	/uploads/YKSN298_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Faiza Ashalina Priambodo	Faiza Ashalina Priambodo	t	2026-03-09 01:01:20.509308
4717	YKSN299	Kamilah Adzkiyah Priambodo	f	3515186503210001	/uploads/YKSN299_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Kamilah adzkiyah Priambodo	Kamilah Adzkiyah Priambodo	t	2026-03-09 01:01:20.509308
4718	YKSN319	Santoso	t	331601000000000	/uploads/YKSN319_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Santoso	Santoso	t	2026-03-09 01:01:20.509308
4719	YKSN192	Syahroni Kurni	t	3507180707000005	/uploads/YKSN192_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Syahroni Kurni	Syahroni Kurni	t	2026-03-09 01:01:20.509308
4720	YKSN193	Shevilla Helmia Fauzita	t	3172046704980006	/uploads/YKSN193_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Shevilla Helmia Fauzita	Shevilla Helmia Fauzita	t	2026-03-09 01:01:20.509308
4721	YKSN195	Yoki Olp	f	3175102607810005	/uploads/YKSN195_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Yoki olp	Yoki Olp	t	2026-03-09 01:01:20.509308
4722	YKSN195	Hepy	f	3175065810820014	/uploads/YKSN195_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Hepy	Hepy	t	2026-03-09 01:01:20.509308
4723	YKSN195	Alyca Ayu	f	3572016106110001	/uploads/YKSN195_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Alyca ayu	Alyca Ayu	t	2026-03-09 01:01:20.509308
4724	YKSN196	Bugleg	f	3174071006721001	/uploads/YKSN196_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Bugleg	Bugleg	t	2026-03-09 01:01:20.509308
4725	YKSN197	Nadia Virannisa Ardillah	t	3328014309000001	/uploads/YKSN197_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Nadia Virannisa Ardillah	Nadia Virannisa Ardillah	t	2026-03-09 01:01:20.509308
4726	YKSN198	Hermansyah	f	3195040606730011	/uploads/YKSN198_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Hermansyah	Hermansyah	t	2026-03-09 01:01:20.509308
4727	YKSN198	Safira Ayuni Larasati	f	3175044808090003	/uploads/YKSN198_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Safira Ayuni Larasati	Safira Ayuni Larasati	t	2026-03-09 01:01:20.509308
4728	YKSN199	Yoga Martio Pratama	t	3175060503980001	/uploads/YKSN199_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Yoga martio pratama	Yoga Martio Pratama	t	2026-03-09 01:01:20.509308
4729	YKSN199	Lutfi Fatimah Gandasari	f	3328096506940001	/uploads/YKSN199_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Lutfi Fatimah gandasari	Lutfi Fatimah Gandasari	t	2026-03-09 01:01:20.509308
4730	YKSN199	Raden Baryal Pratama	f	3175061909220010	/uploads/YKSN199_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Raden baryal pratama	Raden Baryal Pratama	t	2026-03-09 01:01:20.509308
4731	YKSN199	Radif Gaffi Arazka	f	3175062412250005	/uploads/YKSN199_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Radif gaffi arazka	Radif Gaffi Arazka	t	2026-03-09 01:01:20.509308
4732	YKSN200	Rislandi	f	3305231002840002	/uploads/YKSN200_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	RISLANDI	Rislandi	t	2026-03-09 01:01:20.509308
4733	YKSN200	Sri Wahyuningsih	f	3305235211860003	/uploads/YKSN200_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	SRI WAHYUNINGSIH	Sri Wahyuningsih	t	2026-03-09 01:01:20.509308
4734	YKSN200	Fabian Nur Rizki	f	3173010106101011	/uploads/YKSN200_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	FABIAN NUR RIZKI	Fabian Nur Rizki	t	2026-03-09 01:01:20.509308
4735	YKSN301	Badarudin,	f	3305260803830006	/uploads/YKSN301_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Badarudin,	Badarudin,	t	2026-03-09 01:01:20.509308
4748	YKSN205	Diandra Dwi Kirana	f	3175074312160009		f	\N	\N	2026-03-09 01:01:20.509308	4	Diandra Dwi Kirana	Diandra Dwi Kirana	t	2026-03-09 01:01:20.509308
4754	YKSN208	Mohammad Sarifudin	f	3520072007950002		f	\N	\N	2026-03-09 01:01:20.509308	2	Mohammad Sarifudin	Mohammad Sarifudin	t	2026-03-09 01:01:20.509308
4737	YKSN301	Arini Wahyu Ningrum	f	3305265909060001	/uploads/YKSN301_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Arini Wahyu ningrum	Arini Wahyu Ningrum	t	2026-03-09 01:01:20.509308
4738	YKSN301	Farannisa Dahayu Cakrawati	f	3305266309200002	/uploads/YKSN301_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Farannisa dahayu cakrawati	Farannisa Dahayu Cakrawati	t	2026-03-09 01:01:20.509308
4739	YKSN202	Eka Yuni Purnama	t	3403111006900002	/uploads/YKSN202_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	EKA YUNI PURNAMA	Eka Yuni Purnama	t	2026-03-09 01:01:20.509308
4740	YKSN204	Tutut Irwansyah	t	3310231509890001	/uploads/YKSN204_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Tutut Irwansyah	Tutut Irwansyah	t	2026-03-09 01:01:20.509308
4741	YKSN204	Nikmah Nur Baeti	f	3175014910930007	/uploads/YKSN204_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Nikmah nur baeti	Nikmah Nur Baeti	t	2026-03-09 01:01:20.509308
4742	YKSN204	Bening Hati Mulia	f	3175014501210001	/uploads/YKSN204_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Bening hati mulia	Bening Hati Mulia	t	2026-03-09 01:01:20.509308
4743	YKSN316	Nuryadah	f	3328055408790002	/uploads/YKSN316_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	NURYADAH	Nuryadah	t	2026-03-09 01:01:20.509308
4744	YKSN316	Sherly Aprilia	f	3328054104010005	/uploads/YKSN316_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	SHERLY APRILIA	Sherly Aprilia	t	2026-03-09 01:01:20.509308
4745	YKSN205	Inema Sari	t	3521126508810004	/uploads/YKSN205_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Inema sari	Inema Sari	t	2026-03-09 01:01:20.509308
4746	YKSN205	Sunarto	f	3521123011850005	/uploads/YKSN205_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Sunarto	Sunarto	t	2026-03-09 01:01:20.509308
4747	YKSN205	Okta Yoga Pratama	f	3521120810110002	/uploads/YKSN205_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Okta yoga Pratama	Okta Yoga Pratama	t	2026-03-09 01:01:20.509308
4749	YKSN207	Lita Oktaviani	f	3172046310890007	/uploads/YKSN207_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Lita Oktaviani	Lita Oktaviani	t	2026-03-09 01:01:20.509308
4750	YKSN207	Suyanto	f	3174031606811001	/uploads/YKSN207_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Suyanto	Suyanto	t	2026-03-09 01:01:20.509308
4751	YKSN207	Raffasya Azka Alvaro	f	3174030309170002	/uploads/YKSN207_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Raffasya Azka Alvaro	Raffasya Azka Alvaro	t	2026-03-09 01:01:20.509308
4752	YKSN207	Raisya Azaliah Shanaya	f	3174035109240003	/uploads/YKSN207_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Raisya Azaliah Shanaya	Raisya Azaliah Shanaya	t	2026-03-09 01:01:20.509308
4753	YKSN208	Dwi Purwati	t	3520076410920004	/uploads/YKSN208_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Dwi Purwati	Dwi Purwati	t	2026-03-09 01:01:20.509308
4755	YKSN297	Marsono	f	3310152606860001	/uploads/YKSN297_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Marsono	Marsono	t	2026-03-09 01:01:20.509308
4756	YKSN297	Hartini	f	3671094404830006	/uploads/YKSN297_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	HARTINI	Hartini	t	2026-03-09 01:01:20.509308
4757	YKSN297	Mahira Hasna Kamila	f	3671095005170005	/uploads/YKSN297_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	MAHIRA HASNA KAMILA	Mahira Hasna Kamila	t	2026-03-09 01:01:20.509308
4758	YKSN209	Yusril	t	7302070801960003	/uploads/YKSN209_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Yusril	Yusril	t	2026-03-09 01:01:20.509308
4759	YKSN209	Anjarwati	f	3517054407970001	/uploads/YKSN209_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Anjarwati	Anjarwati	t	2026-03-09 01:01:20.509308
4760	YKSN209	Nuha Mardhatilla	f	\N	/uploads/YKSN209_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Nuha Mardhatilla	Nuha Mardhatilla	t	2026-03-09 01:01:20.509308
4761	YKSN210	Henny Novita	t	3603014107930008	/uploads/YKSN210_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Henny Novita	Henny Novita	t	2026-03-09 01:01:20.509308
4762	YKSN210	Siti Zaenab	f	3603017112710002	/uploads/YKSN210_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Siti Zaenab	Siti Zaenab	t	2026-03-09 01:01:20.509308
4763	YKSN210	Brilian Alvaro Gustiawan	f	3603010711180001	/uploads/YKSN210_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Brilian Alvaro Gustiawan	Brilian Alvaro Gustiawan	t	2026-03-09 01:01:20.509308
4764	YKSN210	Barra Alfaraz Gustiawan	f	3603012202220001	/uploads/YKSN210_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Barra Alfaraz Gustiawan	Barra Alfaraz Gustiawan	t	2026-03-09 01:01:20.509308
4765	YKSN211	Adyatna Jamiat	t	3308100412960001	/uploads/YKSN211_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Adyatna jamiat	Adyatna Jamiat	t	2026-03-09 01:01:20.509308
4766	YKSN212	Dariti	f	3171054908840002	/uploads/YKSN212_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Dariti	Dariti	t	2026-03-09 01:01:20.509308
4767	YKSN212	Citra Ayu Isnina Alfi Wijayanti	f	3171056208051001	/uploads/YKSN212_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Citra Ayu Isnina Alfi Wijayanti	Citra Ayu Isnina Alfi Wijayanti	t	2026-03-09 01:01:20.509308
4768	YKSN213	Susi Susanti	t	3175034607910002	/uploads/YKSN213_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Susi Susanti	Susi Susanti	t	2026-03-09 01:01:20.509308
4769	YKSN213	Boby Sahputra Bakara	f	1271090809930001	/uploads/YKSN213_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Boby Sahputra Bakara	Boby Sahputra Bakara	t	2026-03-09 01:01:20.509308
4770	YKSN213	Afiqah Putri Bakara	f	3175036308141003	/uploads/YKSN213_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Afiqah Putri Bakara	Afiqah Putri Bakara	t	2026-03-09 01:01:20.509308
4771	YKSN213	Haikal Ar Rayyan Putra Bakara	f	3175030211210005	/uploads/YKSN213_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Haikal Ar Rayyan Putra Bakara	Haikal Ar Rayyan Putra Bakara	t	2026-03-09 01:01:20.509308
4772	YKSN214	Rudianto	f	3305151210900002	/uploads/YKSN214_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Rudianto	Rudianto	t	2026-03-09 01:01:20.509308
4773	YKSN214	Rani Puspita Sari	f	3305206403900002	/uploads/YKSN214_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Rani Puspita Sari	Rani Puspita Sari	t	2026-03-09 01:01:20.509308
4774	YKSN215	Agung Dwi Prasetyo	t	3305202511950002	/uploads/YKSN215_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Agung Dwi Prasetyo	Agung Dwi Prasetyo	t	2026-03-09 01:01:20.509308
4796	YKSN222	Abdul Wahid	f	3521123001750003		f	\N	\N	2026-03-09 01:01:20.509308	2	Abdul Wahid	Abdul Wahid	t	2026-03-09 01:01:20.509308
4814	YKSN311	Agung Saefullah	f	3207172003000004		f	\N	\N	2026-03-09 01:01:20.509308	2	AGUNG SAEFULLAH	Agung Saefullah	t	2026-03-09 01:01:20.509308
4776	YKSN216	Suwarni	f	3276036709680002	/uploads/YKSN216_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	SUWARNI	Suwarni	t	2026-03-09 01:01:20.509308
4777	YKSN216	Almira Pangesti Ramadhani	f	3276035209080005	/uploads/YKSN216_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	ALMIRA PANGESTI RAMADHANI	Almira Pangesti Ramadhani	t	2026-03-09 01:01:20.509308
4778	YKSN216	Alfan Bagus Armedy	f	3521150205980002	/uploads/YKSN216_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	ALFAN BAGUS ARMEDY	Alfan Bagus Armedy	t	2026-03-09 01:01:20.509308
4779	YKSN216	Tri Purbowasono	f	3603172201770003	/uploads/YKSN216_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	TRI PURBOWASONO	Tri Purbowasono	t	2026-03-09 01:01:20.509308
4780	YKSN217	Teguh Rahmanto	t	3276082105760002	/uploads/YKSN217_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Teguh Rahmanto	Teguh Rahmanto	t	2026-03-09 01:01:20.509308
4781	YKSN217	Satilah	f	3276054408800005	/uploads/YKSN217_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Satilah	Satilah	t	2026-03-09 01:01:20.509308
4782	YKSN217	Zanna Kirania Davira	f	3276080609100001	/uploads/YKSN217_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Zanna Kirania Davira	Zanna Kirania Davira	t	2026-03-09 01:01:20.509308
4783	YKSN218	Angga Eka Widiatmoko	t	3310053005930003	/uploads/YKSN218_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Angga Eka Widiatmoko	Angga Eka Widiatmoko	t	2026-03-09 01:01:20.509308
4784	YKSN218	Budi Putri Utami	f	3310144111950001	/uploads/YKSN218_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Budi Putri Utami	Budi Putri Utami	t	2026-03-09 01:01:20.509308
4785	YKSN218	Ramdhan Dika Wiratama	f	3310050306190003	/uploads/YKSN218_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Ramdhan Dika Wiratama	Ramdhan Dika Wiratama	t	2026-03-09 01:01:20.509308
4786	YKSN300	Fendi Irawan	f	3310042402010001	/uploads/YKSN300_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Fendi Irawan	Fendi Irawan	t	2026-03-09 01:01:20.509308
4787	YKSN219	Agus Riyanto	f	3314151807890002	/uploads/YKSN219_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Agus Riyanto	Agus Riyanto	t	2026-03-09 01:01:20.509308
4788	YKSN219	Lestari	f	3312204406850002	/uploads/YKSN219_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Lestari	Lestari	t	2026-03-09 01:01:20.509308
4789	YKSN219	Muhammad Khoirul Nizam	f	3312203105120002	/uploads/YKSN219_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Muhammad Khoirul Nizam	Muhammad Khoirul Nizam	t	2026-03-09 01:01:20.509308
4790	YKSN219	Syahrian Abimanyu	f	3312200311210002	/uploads/YKSN219_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Syahrian Abimanyu	Syahrian Abimanyu	t	2026-03-09 01:01:20.509308
4791	YKSN220	Barto Fitrain	t	3175011106861001	/uploads/YKSN220_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	barto fitrain	Barto Fitrain	t	2026-03-09 01:01:20.509308
4792	YKSN220	Saiah	f	3175014207941003	/uploads/YKSN220_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	saiah	Saiah	t	2026-03-09 01:01:20.509308
4793	YKSN221	Rubiana	f	3175076004710005	/uploads/YKSN221_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Rubiana	Rubiana	t	2026-03-09 01:01:20.509308
4794	YKSN221	Siti Fatimah	f	3175075203700012	/uploads/YKSN221_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Siti Fatimah	Siti Fatimah	t	2026-03-09 01:01:20.509308
4795	YKSN222	Haris Elfa Robi	t	3521122002010001	/uploads/YKSN222_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Haris Elfa Robi	Haris Elfa Robi	t	2026-03-09 01:01:20.509308
4797	YKSN223	Waluyo	t	3172020703850012	/uploads/YKSN223_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Waluyo	Waluyo	t	2026-03-09 01:01:20.509308
4798	YKSN223	Supriyono	f	3172021601810004	/uploads/YKSN223_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Supriyono	Supriyono	t	2026-03-09 01:01:20.509308
4799	YKSN224	Alfi Revolusi	t	3505115305900003	/uploads/YKSN224_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Alfi Revolusi	Alfi Revolusi	t	2026-03-09 01:01:20.509308
4800	YKSN225	Dewi Damayanti	f	3603226401850004	/uploads/YKSN225_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Dewi Damayanti	Dewi Damayanti	t	2026-03-09 01:01:20.509308
4801	YKSN225	Malika Afroza Agatha	f	360322640120003	/uploads/YKSN225_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Malika Afroza Agatha	Malika Afroza Agatha	t	2026-03-09 01:01:20.509308
4802	YKSN225	Wayung Ghanesha	f	3603202905150005	/uploads/YKSN225_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Wayung Ghanesha	Wayung Ghanesha	t	2026-03-09 01:01:20.509308
4803	YKSN225	Dimas Danu Wijaya	f	3603201004170007	/uploads/YKSN225_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Dimas Danu Wijaya	Dimas Danu Wijaya	t	2026-03-09 01:01:20.509308
4804	YKSN226	Yoyok Siswoyo	f	3603222309800003	/uploads/YKSN226_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	yoyok siswoyo	Yoyok Siswoyo	t	2026-03-09 01:01:20.509308
4805	YKSN310	Sutrisna Mijaya	t	3671111501840001	/uploads/YKSN310_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Sutrisna Mijaya	Sutrisna Mijaya	t	2026-03-09 01:01:20.509308
4806	YKSN310	Dewinta Sriastuti	f	32780405002970011	/uploads/YKSN310_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Dewinta Sriastuti	Dewinta Sriastuti	t	2026-03-09 01:01:20.509308
4807	YKSN310	Adeeva Afshen Myesha Deris	f	3671117110150002	/uploads/YKSN310_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Adeeva Afshen Myesha Deris	Adeeva Afshen Myesha Deris	t	2026-03-09 01:01:20.509308
4808	YKSN310	Muhammad Salim Akbar	f	3671111401190004	/uploads/YKSN310_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Muhammad Salim Akbar	Muhammad Salim Akbar	t	2026-03-09 01:01:20.509308
4809	YKSN228	Hartono	f	3310022904870001	/uploads/YKSN228_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	HARTONO	Hartono	t	2026-03-09 01:01:20.509308
4810	YKSN228	Yaumah Mardekatiyati	f	3301185708940007	/uploads/YKSN228_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	YAUMAH MARDEKATIYATI	Yaumah Mardekatiyati	t	2026-03-09 01:01:20.509308
4811	YKSN228	Rahmadhani Sri Hartanti	f	3174055507151007	/uploads/YKSN228_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	RAHMADHANI SRI HARTANTI	Rahmadhani Sri Hartanti	t	2026-03-09 01:01:20.509308
4812	YKSN228	Livia Putri Hartanti	f	3174056810190002	/uploads/YKSN228_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	LIVIA PUTRI HARTANTI	Livia Putri Hartanti	t	2026-03-09 01:01:20.509308
4813	YKSN311	Khuzaeri	f	3302120809710002	/uploads/YKSN311_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	KHUZAERI	Khuzaeri	t	2026-03-09 01:01:20.509308
4852	YKSN314	Achraf Shayne Narendra	f	3603122104250001		f	\N	\N	2026-03-09 01:01:20.509308	4	Achraf shayne Narendra	Achraf Shayne Narendra	t	2026-03-09 01:01:20.509308
4817	YKSN229	Ida Rahmawati	f	3207206107960002	/uploads/YKSN229_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Ida rahmawati	Ida Rahmawati	t	2026-03-09 01:01:20.509308
4818	YKSN229	Lailaul Zahira Ramadani	f	3301104505210001	/uploads/YKSN229_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Lailaul zahira ramadani	Lailaul Zahira Ramadani	t	2026-03-09 01:01:20.509308
4819	YKSN229	Nadia Nasyatul Kamila	f	3301106301230002	/uploads/YKSN229_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Nadia nasyatul kamila	Nadia Nasyatul Kamila	t	2026-03-09 01:01:20.509308
4820	YKSN230	Rusiti	t	3302036306960005	/uploads/YKSN230_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Rusiti	Rusiti	t	2026-03-09 01:01:20.509308
4821	YKSN231	Agus Teguh Budiman	f	3671111708810011	/uploads/YKSN231_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	AGUS TEGUH BUDIMAN	Agus Teguh Budiman	t	2026-03-09 01:01:20.509308
4822	YKSN231	Dian Siswanti	f	3671115012860003	/uploads/YKSN231_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	DIAN SISWANTI	Dian Siswanti	t	2026-03-09 01:01:20.509308
4823	YKSN231	Azka Qanita Sakhi	f	3671114505090004	/uploads/YKSN231_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	AZKA QANITA SAKHI	Azka Qanita Sakhi	t	2026-03-09 01:01:20.509308
4824	YKSN231	Al Zahira Khairu Lubna	f	3671114411130001	/uploads/YKSN231_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	AL ZAHIRA KHAIRU LUBNA	Al Zahira Khairu Lubna	t	2026-03-09 01:01:20.509308
4825	YKSN233	Saepudin	f	3216150302560001	/uploads/YKSN233_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Saepudin	Saepudin	t	2026-03-09 01:01:20.509308
4827	YKSN234	Aswadi Makku	t	8271021902790003	/uploads/YKSN234_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Aswadi makku	Aswadi Makku	t	2026-03-09 01:01:20.509308
4828	YKSN235	Sujiat Wati	t	3301074707920004	/uploads/YKSN235_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Sujiat Wati	Sujiat Wati	t	2026-03-09 01:01:20.509308
4829	YKSN312	Budi Prasetyo	f	3173011205101009	/uploads/YKSN312_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Budi Prasetyo	Budi Prasetyo	t	2026-03-09 01:01:20.509308
4830	YKSN312	Sumiati	f	3322175303760004	/uploads/YKSN312_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Sumiati	Sumiati	t	2026-03-09 01:01:20.509308
4831	YKSN312	Aditya Rahman	f	3173011003001003	/uploads/YKSN312_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Aditya Rahman	Aditya Rahman	t	2026-03-09 01:01:20.509308
4832	YKSN313	Verdia Kartika Dwi Lestari	f	3305176011060001	/uploads/YKSN313_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Verdia kartika dwi lestari	Verdia Kartika Dwi Lestari	t	2026-03-09 01:01:20.509308
4833	YKSN236	Sudiyono	t	3603282406700006	/uploads/YKSN236_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Sudiyono	Sudiyono	t	2026-03-09 01:01:20.509308
4834	YKSN236	Siti Ngaisah	f	3603284911720004	/uploads/YKSN236_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Siti Ngaisah	Siti Ngaisah	t	2026-03-09 01:01:20.509308
4835	YKSN236	Arlen Aprilya Wulandari	f	3603286104010013	/uploads/YKSN236_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Arlen Aprilya Wulandari	Arlen Aprilya Wulandari	t	2026-03-09 01:01:20.509308
4836	YKSN236	Melisa Dwi Safitri	f	3603284112050008	/uploads/YKSN236_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Melisa Dwi Safitri	Melisa Dwi Safitri	t	2026-03-09 01:01:20.509308
4837	YKSN237	Gilang Andra Sadewa	t	3305022403070001	/uploads/YKSN237_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	GILANG ANDRA SADEWA	Gilang Andra Sadewa	t	2026-03-09 01:01:20.509308
4838	YKSN237	Marwan	f	3305021602830001	/uploads/YKSN237_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	MARWAN	Marwan	t	2026-03-09 01:01:20.509308
4839	YKSN237	Muhammad Arif Saputro	f	3308112501990003	/uploads/YKSN237_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	MUHAMMAD ARIF SAPUTRO	Muhammad Arif Saputro	t	2026-03-09 01:01:20.509308
4840	YKSN237	Dwi Rahmat Aqdannawi	f	3308110209050002	/uploads/YKSN237_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	DWI RAHMAT AQDANNAWI	Dwi Rahmat Aqdannawi	t	2026-03-09 01:01:20.509308
4841	YKSN239	Arif Muslim	t	3301111302740002	/uploads/YKSN239_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Arif Muslim	Arif Muslim	t	2026-03-09 01:01:20.509308
4842	YKSN240	Rina Purwaningsih	t	3211227009830005	/uploads/YKSN240_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Rina Purwaningsih	Rina Purwaningsih	t	2026-03-09 01:01:20.509308
4843	YKSN240	Alis Wandi	f	3211221709820020	/uploads/YKSN240_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Alis Wandi	Alis Wandi	t	2026-03-09 01:01:20.509308
4844	YKSN240	Archisha Vanya Rahasatul'Aisy	f	3211226305110003	/uploads/YKSN240_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Archisha Vanya Rahasatul'aisy	Archisha Vanya Rahasatul'Aisy	t	2026-03-09 01:01:20.509308
4845	YKSN240	Abiyyu Arfa Muazzam	f	3211222111130002	/uploads/YKSN240_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Abiyyu Arfa Muazzam	Abiyyu Arfa Muazzam	t	2026-03-09 01:01:20.509308
4846	YKSN241	Saiful Chosim	t	3306050609830003	/uploads/YKSN241_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Saiful chosim	Saiful Chosim	t	2026-03-09 01:01:20.509308
4847	YKSN242	Arman Darmawan	t	3174080811740003	/uploads/YKSN242_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Arman Darmawan	Arman Darmawan	t	2026-03-09 01:01:20.509308
4848	YKSN242	Damar Wisanggeni	f	3174092805101001	/uploads/YKSN242_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Damar Wisanggeni	Damar Wisanggeni	t	2026-03-09 01:01:20.509308
4849	YKSN314	Arum Novita Sari	f	3603126411990003	/uploads/YKSN314_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Arum Novita Sari	Arum Novita Sari	t	2026-03-09 01:01:20.509308
4850	YKSN314	Marjiyati	f	3603124904770004	/uploads/YKSN314_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Marjiyati	Marjiyati	t	2026-03-09 01:01:20.509308
4851	YKSN314	Nadya Rahmawati	f	3603126704110004	/uploads/YKSN314_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Nadya Rahmawati	Nadya Rahmawati	t	2026-03-09 01:01:20.509308
4853	YKSN245	Joko Yuliantoro	f	3404122907890003	/uploads/YKSN245_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Joko yuliantoro	Joko Yuliantoro	t	2026-03-09 01:01:20.509308
4854	YKSN245	Bahriyatul Ulumil Hidayah	t	3276034104930005	/uploads/YKSN245_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Bahriyatul ulumil hidayah	Bahriyatul Ulumil Hidayah	t	2026-03-09 01:01:20.509308
4826	YKSN233	Kaminem	f	3216155007690002	/uploads/YKSN233_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Kaminem	Kaminem	t	2026-03-09 01:01:20.509308
4869	YKSN250	Roni Apriyanto	f	3301081404030001		f	\N	\N	2026-03-09 01:01:20.509308	4	Roni Apriyanto	Roni Apriyanto	t	2026-03-09 01:01:20.509308
4856	YKSN246	Reni Nuraeni	f	3206295210000001	/uploads/YKSN246_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Reni Nuraeni	Reni Nuraeni	t	2026-03-09 01:01:20.509308
4857	YKSN247	Iman Kurnia	t	3173020205760001	/uploads/YKSN247_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Iman Kurnia	Iman Kurnia	t	2026-03-09 01:01:20.509308
4858	YKSN247	Sumarni Nuraeni	f	3206244506850004	/uploads/YKSN247_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Sumarni Nuraeni	Sumarni Nuraeni	t	2026-03-09 01:01:20.509308
4859	YKSN247	Muhammad Ikhsan Nugraha	f	3173022206061005	/uploads/YKSN247_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Muhammad Ikhsan Nugraha	Muhammad Ikhsan Nugraha	t	2026-03-09 01:01:20.509308
4860	YKSN247	Nazril Ilham Maulana	f	3173022908190002	/uploads/YKSN247_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Nazril Ilham Maulana	Nazril Ilham Maulana	t	2026-03-09 01:01:20.509308
4861	YKSN248	Muhammad Rizki Febrian	t	3603121102020002	/uploads/YKSN248_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Muhammad Rizki Febrian	Muhammad Rizki Febrian	t	2026-03-09 01:01:20.509308
4862	YKSN249	Dzikri Alfian	f	3173011005961001	/uploads/YKSN249_pass_1.jpg	t	2026-03-10 06:36:44.266	Unknown	2026-03-09 01:01:20.509308	1	Dzikri Alfian	Dzikri Alfian	t	2026-03-09 01:01:20.509308
4863	YKSN249	Fendi Pratama	f	3301090909970003	/uploads/YKSN249_pass_2.jpg	t	2026-03-10 06:36:44.266	Unknown	2026-03-09 01:01:20.509308	2	Fendi Pratama	Fendi Pratama	t	2026-03-09 01:01:20.509308
4864	YKSN249	Sumini	f	3173014508740006	/uploads/YKSN249_pass_3.jpg	t	2026-03-10 06:36:44.266	Unknown	2026-03-09 01:01:20.509308	3	Sumini	Sumini	t	2026-03-09 01:01:20.509308
4865	YKSN249	Dhika Aburizal Pratomo	t	3174041709900006	/uploads/YKSN249_pass_4.jpg	t	2026-03-10 06:36:44.266	Unknown	2026-03-09 01:01:20.509308	4	Dhika Aburizal Pratomo	Dhika Aburizal Pratomo	t	2026-03-09 01:01:20.509308
4866	YKSN250	Jumadi	t	198112062025211023	/uploads/YKSN250_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Jumadi	Jumadi	t	2026-03-09 01:01:20.509308
4867	YKSN250	Tumini	f	3301086908840003	/uploads/YKSN250_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Tumini	Tumini	t	2026-03-09 01:01:20.509308
4868	YKSN250	Reno Dwi Saputro	f	3301081709060001	/uploads/YKSN250_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Reno Dwi Saputro	Reno Dwi Saputro	t	2026-03-09 01:01:20.509308
4870	YKSN251	Suwarto	t	3603310503740003	/uploads/YKSN251_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Suwarto	Suwarto	t	2026-03-09 01:01:20.509308
4871	YKSN252	Alpirera Herlan	t	1672011404950001	/uploads/YKSN252_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Alpirera Herlan	Alpirera Herlan	t	2026-03-09 01:01:20.509308
4872	YKSN253	Supardi	t	3671110804750001	/uploads/YKSN253_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Supardi	Supardi	t	2026-03-09 01:01:20.509308
4873	YKSN253	Patimah	f	3671116202790001	/uploads/YKSN253_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Patimah	Patimah	t	2026-03-09 01:01:20.509308
4874	YKSN253	Ahmad Nur Ikhwan	f	3671110808070004	/uploads/YKSN253_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Ahmad Nur Ikhwan	Ahmad Nur Ikhwan	t	2026-03-09 01:01:20.509308
4875	YKSN253	Faizul Anwar	f	3671111508100006	/uploads/YKSN253_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Faizul Anwar	Faizul Anwar	t	2026-03-09 01:01:20.509308
4876	YKSN254	Wisman Sunandar	t	3306091706920002	/uploads/YKSN254_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Wisman sunandar	Wisman Sunandar	t	2026-03-09 01:01:20.509308
4877	YKSN254	Ria Dwi Setyaningrum	f	3306054311920003	/uploads/YKSN254_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Ria dwi setyaningrum	Ria Dwi Setyaningrum	t	2026-03-09 01:01:20.509308
4878	YKSN254	Navya Numa Idrani	f	3306094601200001	/uploads/YKSN254_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Navya numa idrani	Navya Numa Idrani	t	2026-03-09 01:01:20.509308
4879	YKSN255	Gracesanita Anggi Pradipta	t	3674054911970002	/uploads/YKSN255_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Gracesanita Anggi Pradipta	Gracesanita Anggi Pradipta	t	2026-03-09 01:01:20.509308
4880	YKSN255	Ragita Sazakia Ivanka Cawla	f	3674054610990002	/uploads/YKSN255_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Ragita Sazakia Ivanka Cawla	Ragita Sazakia Ivanka Cawla	t	2026-03-09 01:01:20.509308
4881	YKSN255	Sri Suyati	f	3674055504710003	/uploads/YKSN255_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Sri Suyati	Sri Suyati	t	2026-03-09 01:01:20.509308
4882	YKSN256	Dorothea	f	3175075002760007	/uploads/YKSN256_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Dorothea	Dorothea	t	2026-03-09 01:01:20.509308
4883	YKSN256	Andrian Rizki Oktavian	f	3175072610050017	/uploads/YKSN256_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Andrian Rizki Oktavian	Andrian Rizki Oktavian	t	2026-03-09 01:01:20.509308
4884	YKSN256	Heriybertus Krishardiyatno	f	3175071503700013	/uploads/YKSN256_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Heriybertus krishardiyatno	Heriybertus Krishardiyatno	t	2026-03-09 01:01:20.509308
4885	YKSN256	Septanto Suparman	f	3175071109070001	/uploads/YKSN256_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Septanto Suparman	Septanto Suparman	t	2026-03-09 01:01:20.509308
4886	YKSN257	Sokhib Thoyib	f	3207310208710001	/uploads/YKSN257_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Sokhib thoyib	Sokhib Thoyib	t	2026-03-09 01:01:20.509308
4887	YKSN257	Mardi	f	3173050609660009	/uploads/YKSN257_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Mardi	Mardi	t	2026-03-09 01:01:20.509308
4888	YKSN257	Tukiman	f	3313081111750002	/uploads/YKSN257_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Tukiman	Tukiman	t	2026-03-09 01:01:20.509308
4889	YKSN257	Nur Halimah	f	3328035903780003	/uploads/YKSN257_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Nur Halimah	Nur Halimah	t	2026-03-09 01:01:20.509308
4890	YKSN258	Marlina	f	3402166711890001	/uploads/YKSN258_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Marlina	Marlina	t	2026-03-09 01:01:20.509308
4891	YKSN258	Narendra Aspradeta	f	3403010609880002	/uploads/YKSN258_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Narendra Aspradeta	Narendra Aspradeta	t	2026-03-09 01:01:20.509308
4892	YKSN258	Alkhalifi Abrian Nandra	f	3403010412150002	/uploads/YKSN258_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Alkhalifi Abrian Nandra	Alkhalifi Abrian Nandra	t	2026-03-09 01:01:20.509308
4893	YKSN258	Jasmine Aurora Minandra Mecca	f	3275035609200005	/uploads/YKSN258_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Jasmine Aurora Minandra Mecca	Jasmine Aurora Minandra Mecca	t	2026-03-09 01:01:20.509308
4923	YKSN269	Muhamad Alfath Riskianto	f	3212293105150004		f	\N	\N	2026-03-09 01:01:20.509308	3	Muhamad alfath riskianto	Muhamad Alfath Riskianto	t	2026-03-09 01:01:20.509308
4894	YKSN259	Risna Sartika	t	3575025402010002	/uploads/YKSN259_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Risna Sartika	Risna Sartika	t	2026-03-09 01:01:20.509308
4895	YKSN260	Anggi Nur Wulan	t	3207026609020001	/uploads/YKSN260_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Anggi Nur Wulan	Anggi Nur Wulan	t	2026-03-09 01:01:20.509308
4896	YKSN261	Dwi Nur Aini	f	3175055908750001	/uploads/YKSN261_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	DWI NUR AINI	Dwi Nur Aini	t	2026-03-09 01:01:20.509308
4897	YKSN261	Kayla Mutie Izzati	f	3175055512081003	/uploads/YKSN261_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	KAYLA MUTIE IZZATI	Kayla Mutie Izzati	t	2026-03-09 01:01:20.509308
4898	YKSN261	Alya Rizky Nabila	f	3175056509040001	/uploads/YKSN261_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	ALYA RIZKY NABILA	Alya Rizky Nabila	t	2026-03-09 01:01:20.509308
4899	YKSN262	Asih Winarni	f	3173015706930006	/uploads/YKSN262_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Asih Winarni	Asih Winarni	t	2026-03-09 01:01:20.509308
4900	YKSN262	Milatun Nasikhah	t	3324164210920001	/uploads/YKSN262_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Milatun Nasikhah	Milatun Nasikhah	t	2026-03-09 01:01:20.509308
4901	YKSN262	Anisa Siti Chatimah	f	3173014805000001	/uploads/YKSN262_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Anisa Siti Chatimah	Anisa Siti Chatimah	t	2026-03-09 01:01:20.509308
4902	YKSN262	Nathan Alfarizqi	f	3173012010250004	/uploads/YKSN262_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Nathan Alfarizqi	Nathan Alfarizqi	t	2026-03-09 01:01:20.509308
4903	YKSN263	Khairunnisa Nurjannati	t	3671054603020010	/uploads/YKSN263_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Khairunnisa Nurjannati	Khairunnisa Nurjannati	t	2026-03-09 01:01:20.509308
4904	YKSN263	Suharti	f	3671055003800015	/uploads/YKSN263_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Suharti	Suharti	t	2026-03-09 01:01:20.509308
4905	YKSN263	Muhammad Zaky Mubaroq	f	3671053101070002	/uploads/YKSN263_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Muhammad Zaky Mubaroq	Muhammad Zaky Mubaroq	t	2026-03-09 01:01:20.509308
4906	YKSN263	W Dian Satria Putra	f	3671051310680003	/uploads/YKSN263_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	W Dian Satria Putra	W Dian Satria Putra	t	2026-03-09 01:01:20.509308
4907	YKSN264	Riski Nurwanto	t	3301182009000006	/uploads/YKSN264_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Riski Nurwanto	Riski Nurwanto	t	2026-03-09 01:01:20.509308
4908	YKSN265	Burhan	f	3305180210670001	/uploads/YKSN265_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	BURHAN	Burhan	t	2026-03-09 01:01:20.509308
4909	YKSN265	Haniyah	f	3305186804770001	/uploads/YKSN265_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	HANIYAH	Haniyah	t	2026-03-09 01:01:20.509308
4910	YKSN265	Agus Priwanto	f	3305181408900003	/uploads/YKSN265_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	AGUS PRIWANTO	Agus Priwanto	t	2026-03-09 01:01:20.509308
4911	YKSN266	Saidi	f	3305171805700001	/uploads/YKSN266_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Saidi	Saidi	t	2026-03-09 01:01:20.509308
4912	YKSN266	Waliyah	f	3305175210800001	/uploads/YKSN266_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Waliyah	Waliyah	t	2026-03-09 01:01:20.509308
4913	YKSN266	Sartimi	f	3305174909890003	/uploads/YKSN266_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Sartimi	Sartimi	t	2026-03-09 01:01:20.509308
4914	YKSN266	Nur Khasanah	f	3305174103880003	/uploads/YKSN266_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Nur khasanah	Nur Khasanah	t	2026-03-09 01:01:20.509308
4915	YKSN315	Latifah	f	3305186610080002	/uploads/YKSN315_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Latifah	Latifah	t	2026-03-09 01:01:20.509308
4916	YKSN315	Dasilem	f	3302035104740003	/uploads/YKSN315_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	DASILEM	Dasilem	t	2026-03-09 01:01:20.509308
4917	YKSN286	Hary Adnan	t	3173012309910004	/uploads/YKSN286_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Hary adnan	Hary Adnan	t	2026-03-09 01:01:20.509308
4918	YKSN286	Titik Nur Sakinah	f	3603036006880002	/uploads/YKSN286_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Titik Nur Sakinah	Titik Nur Sakinah	t	2026-03-09 01:01:20.509308
4919	YKSN286	Arkhan Zain Alfafih	f	3603032301170003	/uploads/YKSN286_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Arkhan Zain Alfafih	Arkhan Zain Alfafih	t	2026-03-09 01:01:20.509308
4920	YKSN286	Navisha Zea Elshanum	f	3603306505230003	/uploads/YKSN286_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Navisha Zea Elshanum	Navisha Zea Elshanum	t	2026-03-09 01:01:20.509308
4921	YKSN269	Supri Yanto	f	3306101606880001	/uploads/YKSN269_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Supri yanto	Supri Yanto	t	2026-03-09 01:01:20.509308
4922	YKSN269	Ani Hanifah	f	3212156110900002	/uploads/YKSN269_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Ani hanifah	Ani Hanifah	t	2026-03-09 01:01:20.509308
4924	YKSN270	Irwan Caryo Wasito	f	3311091901940001	/uploads/YKSN270_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Irwan caryo wasito	Irwan Caryo Wasito	t	2026-03-09 01:01:20.509308
4925	YKSN272	Deliah Fitriyani Pratiwi	t	3401026312960001	/uploads/YKSN272_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Deliah Fitriyani Pratiwi	Deliah Fitriyani Pratiwi	t	2026-03-09 01:01:20.509308
4926	YKSN273	Sutrisno Aji	t	3403050605960005	/uploads/YKSN273_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Sutrisno aji	Sutrisno Aji	t	2026-03-09 01:01:20.509308
4927	YKSN274	Ruth Persila Metty Rumsowek	t	9105015705030005	/uploads/YKSN274_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ruth Persila Metty Rumsowek	Ruth Persila Metty Rumsowek	t	2026-03-09 01:01:20.509308
4928	YKSN275	Ignatius De Loyola Aryo Gurmilang	t	198907282022031001	/uploads/YKSN275_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ignatius de Loyola Aryo Gurmilang	Ignatius De Loyola Aryo Gurmilang	t	2026-03-09 01:01:20.509308
4929	YKSN275	Kristina Dwi Oktavia	f	34020666100870004	/uploads/YKSN275_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Kristina Dwi Oktavia	Kristina Dwi Oktavia	t	2026-03-09 01:01:20.509308
4930	YKSN275	Alexandr Arche Gurmilang	f	3174051305160003	/uploads/YKSN275_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	ALEXANDR ARCHE GURMILANG	Alexandr Arche Gurmilang	t	2026-03-09 01:01:20.509308
4931	YKSN275	Carolina Chrisceline Gurmilang	f	3174055911180004	/uploads/YKSN275_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	CAROLINA CHRISCELINE GURMILANG	Carolina Chrisceline Gurmilang	t	2026-03-09 01:01:20.509308
4946	YKSN282	Faisal Ari Fardiansyah	f	3172041810010004		f	\N	\N	2026-03-09 01:01:20.509308	3	Faisal Ari Fardiansyah	Faisal Ari Fardiansyah	t	2026-03-09 01:01:20.509308
4933	YKSN277	Desy Susilawati	t	3301165103940002	/uploads/YKSN277_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Desy Susilawati	Desy Susilawati	t	2026-03-09 01:01:20.509308
4934	YKSN277	Yusuf Cahya Irawan	f	3301163001000001	/uploads/YKSN277_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Yusuf Cahya Irawan	Yusuf Cahya Irawan	t	2026-03-09 01:01:20.509308
4935	YKSN279	Kasmin	f	3301141002850001	/uploads/YKSN279_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Kasmin	Kasmin	t	2026-03-09 01:01:20.509308
4936	YKSN279	Bagus Mardiko	f	3301141708030005	/uploads/YKSN279_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Bagus mardiko	Bagus Mardiko	t	2026-03-09 01:01:20.509308
4937	YKSN280	Trias Oktaviana	t	3175044510920012	/uploads/YKSN280_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Trias Oktaviana	Trias Oktaviana	t	2026-03-09 01:01:20.509308
4938	YKSN280	Trihastuti Rahayu	f	3301125703710006	/uploads/YKSN280_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Trihastuti Rahayu	Trihastuti Rahayu	t	2026-03-09 01:01:20.509308
4939	YKSN280	Nanang Budi Santoso	f	3301122906760003	/uploads/YKSN280_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Nanang Budi Santoso	Nanang Budi Santoso	t	2026-03-09 01:01:20.509308
4940	YKSN281	Karlam Sudiarto	f	3302031603780003	/uploads/YKSN281_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	KARLAM SUDIARTO	Karlam Sudiarto	t	2026-03-09 01:01:20.509308
4941	YKSN281	Darsitem	f	3302036510790002	/uploads/YKSN281_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	DARSITEM	Darsitem	t	2026-03-09 01:01:20.509308
4942	YKSN281	Novianti	f	3302035611980001	/uploads/YKSN281_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	NOVIANTI	Novianti	t	2026-03-09 01:01:20.509308
4943	YKSN281	Nara Galih Saputra	f	3302031604100004	/uploads/YKSN281_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	NARA GALIH SAPUTRA	Nara Galih Saputra	t	2026-03-09 01:01:20.509308
4944	YKSN282	Mala Maulani	f	3602184212970002	/uploads/YKSN282_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Mala Maulani	Mala Maulani	t	2026-03-09 01:01:20.509308
4945	YKSN282	Nabilah Salsabila Setya	f	3174025707180001	/uploads/YKSN282_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Nabilah Salsabila Setya	Nabilah Salsabila Setya	t	2026-03-09 01:01:20.509308
4947	YKSN283	Dwi Purnomo	t	3307010709890002	/uploads/YKSN283_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Dwi purnomo	Dwi Purnomo	t	2026-03-09 01:01:20.509308
4948	YKSN283	Yuni Asih	f	3307016011950004	/uploads/YKSN283_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Yuni Asih	Yuni Asih	t	2026-03-09 01:01:20.509308
4949	YKSN283	Kirana Syaffira Ikabella	f	3307016209170001	/uploads/YKSN283_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Kirana Syaffira Ikabella	Kirana Syaffira Ikabella	t	2026-03-09 01:01:20.509308
4950	YKSN283	Syafiyyah Humaira Hafizah	f	3275116310240002	/uploads/YKSN283_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Syafiyyah humaira hafizah	Syafiyyah Humaira Hafizah	t	2026-03-09 01:01:20.509308
4951	YKSN285	Abi Adzani Genta Ramadhan	t	3305202912990001	/uploads/YKSN285_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	ABI ADZANI GENTA RAMADHAN	Abi Adzani Genta Ramadhan	t	2026-03-09 01:01:20.509308
4952	YKSN268	Ratamto	t	3172041806720006	/uploads/YKSN268_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ratamto	Ratamto	t	2026-03-09 01:01:20.509308
4953	YKSN268	Nurlelanurlela	f	3602184205720004	/uploads/YKSN268_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	NurlelaNurlela	Nurlelanurlela	t	2026-03-09 01:01:20.509308
4954	YKSN268	Arafah Ridwansyah	f	3172040106081001	/uploads/YKSN268_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Arafah ridwansyah	Arafah Ridwansyah	t	2026-03-09 01:01:20.509308
4955	YKSN268	Abi Tri Hermansyah	f	3172040512131004	/uploads/YKSN268_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Abi tri hermansyah	Abi Tri Hermansyah	t	2026-03-09 01:01:20.509308
4956	YKSN287	Hairis Manjaya	t	3671010101760003	/uploads/YKSN287_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Hairis manjaya	Hairis Manjaya	t	2026-03-09 01:01:20.509308
4957	YKSN288	Agus Supriyadi	t	3171021908850006	/uploads/YKSN288_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	AGUS SUPRIYADI	Agus Supriyadi	t	2026-03-09 01:01:20.509308
4958	YKSN288	Satria Dika Pratama	f	3171022003091001	/uploads/YKSN288_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Satria Dika Pratama	Satria Dika Pratama	t	2026-03-09 01:01:20.509308
4959	YKSN289	Kuswari	t	3171070303690006	/uploads/YKSN289_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Kuswari	Kuswari	t	2026-03-09 01:01:20.509308
4960	YKSN289	Dimas Firdaus Adiansa	f	3306110109990002	/uploads/YKSN289_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Dimas Firdaus Adiansa	Dimas Firdaus Adiansa	t	2026-03-09 01:01:20.509308
4961	YKSN244	Ahmad Mufid	t	3275082104820028	/uploads/YKSN244_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ahmad mufid	Ahmad Mufid	t	2026-03-09 01:01:20.509308
4964	YKSN290	Andi Yulianto	t	3306022101830001	/uploads/YKSN290_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	ANDI YULIANTO	Andi Yulianto	t	2026-03-09 01:01:20.509308
4965	YKSN290	Andarwati	f	3276024902890010	/uploads/YKSN290_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	ANDARWATI	Andarwati	t	2026-03-09 01:01:20.509308
4966	YKSN290	Fajar Maulana Sidiq	f	3306021005100002	/uploads/YKSN290_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	FAJAR MAULANA SIDIQ	Fajar Maulana Sidiq	t	2026-03-09 01:01:20.509308
4967	YKSN290	Hasan Ahmad Muzakki	f	3175052502170001	/uploads/YKSN290_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	HASAN AHMAD MUZAKKI	Hasan Ahmad Muzakki	t	2026-03-09 01:01:20.509308
4968	YKSN293	Husaein Ahmad Akhlaqi	f	3275052502170002	/uploads/YKSN293_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Husaein Ahmad Akhlaqi	Husaein Ahmad Akhlaqi	t	2026-03-09 01:01:20.509308
4969	YKSN291	Nilawati	t	3401024311940001	/uploads/YKSN291_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	nilawati	Nilawati	t	2026-03-09 01:01:20.509308
4970	YKSN292	Sri Sumarmi	t	3403014807620002	/uploads/YKSN292_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Sri Sumarmi	Sri Sumarmi	t	2026-03-09 01:01:20.509308
4962	YKSN244	Ghazi Putra Ahmad	f	3275082702150004	/uploads/YKSN244_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Ghazi putra ahmad	Ghazi Putra Ahmad	t	2026-03-09 01:01:20.509308
4963	YKSN244	Evi	f	3275085601780026	/uploads/YKSN244_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Evi	Evi	t	2026-03-09 01:01:20.509308
4240	YKSN006	Dedi Sulaiman	t	3327090907930010	/uploads/YKSN006_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Dedi sulaiman	Dedi Sulaiman	t	2026-03-09 01:01:20.509308
4270	YKSN021	Elly Juliana Tobing	f	6271034212770001	/uploads/YKSN021_pass_2.jpg	f	\N	\N	2026-03-09 01:01:20.509308	2	Elly juliana tobing	Elly Juliana Tobing	t	2026-03-09 01:01:20.509308
4308	YKSN038	Ahmad Shofi	t	3318160606870006	/uploads/YKSN038_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Ahmad shofi	Ahmad Shofi	t	2026-03-09 01:01:20.509308
4346	YKSN055	Shahzad Abyl Shankara Lubis	f	3603120812210002	/uploads/YKSN055_pass_3.jpg	f	\N	\N	2026-03-09 01:01:20.509308	3	Shahzad Abyl Shankara Lubis	Shahzad Abyl Shankara Lubis	t	2026-03-09 01:01:20.509308
4385	YKSN067	Suyadi	f	3216020403860009	/uploads/YKSN067_pass_1.jpg	f	\N	\N	2026-03-09 01:01:20.509308	1	Suyadi	Suyadi	t	2026-03-09 01:01:20.509308
4424	YKSN081	Varisha Ayu Vivi Junaedi	f	3304144603170001	/uploads/YKSN081_pass_4.jpg	f	\N	\N	2026-03-09 01:01:20.509308	4	Varisha Ayu Vivi Junaedi	Varisha Ayu Vivi Junaedi	t	2026-03-09 01:01:20.509308
\.


--
-- Data for Name: registrants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.registrants (id, nama, phone, ktp_url, verified, verified_at, verified_by, created_at) FROM stdin;
REG-001	Ahmad Rizky	081234567890	https://placehold.co/600x400/1a1a2e/a29bfe?text=KTP+Preview+%0AAhmad+Rizky	f	\N	\N	2026-02-18 02:42:16.905752
REG-002	Siti Nurhaliza	087654321098	https://placehold.co/600x400/1a1a2e/00d2a0?text=KTP+Preview+%0ASiti+Nurhaliza	t	\N	\N	2026-02-18 02:42:16.905752
REG-003	Budi Santoso	089912345678	https://placehold.co/600x400/1a1a2e/feca57?text=KTP+Preview+%0ABudi+Santoso	f	\N	\N	2026-02-18 02:42:16.905752
\.


--
-- Data for Name: registrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.registrations (id, phone, ktp_url, created_at, id_card_url, phone_raw, active, last_seen_at, jurusan, kota_tujuan, kelompok_bis, bis, jumlah_orang, kapasitas_bis) FROM stdin;
YKSN002	62895353992014	/uploads/YKSN002_kk.jpg	2026-03-09 00:37:22.924162	/uploads/YKSN002_idcard.jpg	895353992014	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Tegal	Mandiri	MDR01	4	47
YKSN003	6281284805003	/uploads/YKSN003_kk.jpg	2026-03-09 00:37:32.804396	/uploads/YKSN003_idcard.jpg	81284805003	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Tegal	Mandiri	MDR01	1	47
YKSN004	6281376801538	/uploads/YKSN004_kk.png	2026-03-09 00:37:39.977205	/uploads/YKSN004_idcard.png	81376801538	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Mandiri	MDR01	1	47
YKSN005	6288293038984	/uploads/YKSN005_kk.jpg	2026-03-09 00:37:49.955351	/uploads/YKSN005_idcard.jpg	88293038984	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pekalongan	Mandiri	MDR01	1	47
YKSN006	6282221686039	/uploads/YKSN006_kk.jpg	2026-03-09 00:37:54.801626	/uploads/YKSN006_idcard.jpg	82221686039	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pekalongan	Mandiri	MDR01	1	47
YKSN007	6288291624363	/uploads/YKSN007_kk.jpg	2026-03-09 00:38:00.142589	/uploads/YKSN007_idcard.jpg	88291624363	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pekalongan	Mandiri	MDR01	1	47
YKSN008	6281287202452	/uploads/YKSN008_kk.jpg	2026-03-09 00:38:04.9371	/uploads/YKSN008_idcard.jpg	81287202452	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pekalongan	Mandiri	MDR01	1	47
YKSN009	628118888515	/uploads/YKSN009_kk.jpg	2026-03-09 00:38:09.478943	/uploads/YKSN009_idcard.jpg	8118888515	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Kendal	Mandiri	MDR01	1	47
YKSN010	6285280071705	/uploads/YKSN010_kk.jpg	2026-03-09 00:38:17.429	/uploads/YKSN010_idcard.jpg	85280071705	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Semarang	Mandiri	MDR01	1	47
YKSN011	6285782797207	/uploads/YKSN011_kk.jpg	2026-03-09 00:38:24.948231	/uploads/YKSN011_idcard.jpg	85782797207	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Semarang	Mandiri	MDR01	4	47
YKSN012	6287781498400	/uploads/YKSN012_kk.jpg	2026-03-09 00:38:29.890545	/uploads/YKSN012_idcard.jpg	87781498400	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Semarang	Mandiri	MDR01	4	47
YKSN013	6285740600751	/uploads/YKSN013_kk.jpg	2026-03-09 00:38:36.180318	/uploads/YKSN013_idcard.jpg	85740600751	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Demak	Mandiri	MDR01	3	47
YKSN014	62895343061919	/uploads/YKSN014_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN014_idcard.jpg	895343061919	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Kudus	Mandiri	MDR01	1	47
YKSN015	628986899100	/uploads/YKSN015_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN015_idcard.jpg	8986899100	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Kudus	Mandiri	MDR01	3	47
YKSN016	6281215819957	/uploads/YKSN016_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN016_idcard.jpg	81215819957	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pati	Mandiri	MDR01	1	47
YKSN017	628159339400	/uploads/YKSN017_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN017_idcard.jpg	8159339400	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pati	Mandiri	MDR01	4	47
YKSN018	6285719382283	/uploads/YKSN018_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN018_idcard.jpg	85719382283	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pati	Mandiri	MDR01	2	47
YKSN019	6285714530363	/uploads/YKSN019_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN019_idcard.jpg	85714530363	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Mandiri	MDR01	2	47
YKSN059	6289522752643	/uploads/YKSN059_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN059_idcard.jpg	89522752643	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Taspen	TPN01	1	40
YKSN295	6287873232666	/uploads/YKSN295_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN295_idcard.jpg	87873232666	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	\N	TPN01	1	40
YKSN060	6287776734550	/uploads/YKSN060_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN060_idcard.jpg	87776734550	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Taspen	TPN01	4	40
YKSN062	6289669802607	/uploads/YKSN062_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN062_idcard.jpg	89669802607	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Tegal	Taspen	TPN02	4	40
YKSN001	6287748569817	/uploads/YKSN001_kk.jpg	2026-03-09 00:37:15.01943	/uploads/YKSN001_idcard.jpg	87748569817	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Tegal	Mandiri	MDR01	4	47
YKSN021	6281110014517	/uploads/YKSN021_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN021_idcard.jpg	81110014517	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Mandiri	MDR01	3	47
YKSN022	62895364309244	/uploads/YKSN022_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN022_idcard.jpg	895364309244	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Mandiri	MDR01	1	47
YKSN023	6281775247045	/uploads/YKSN023_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN023_idcard.jpg	81775247045	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Mandiri	MDR01	1	47
YKSN024	628977704290	/uploads/YKSN024_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN024_idcard.jpg	8977704290	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Mandiri	MDR01	1	47
YKSN025	62895346000000	/uploads/YKSN025_kk.png	2026-03-09 01:01:20.509308	/uploads/YKSN025_idcard.png	8.95346E+11	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Mandiri	MDR01	1	47
YKSN027	6281316765401	/uploads/YKSN027_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN027_idcard.jpg	81316765401	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Tegal	Mandiri	MDR02	4	50
YKSN029	6287798993307	/uploads/YKSN029_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN029_idcard.jpg	87798993307	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Tegal	Mandiri	MDR02	3	50
YKSN030	6285720126090	/uploads/YKSN030_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN030_idcard.jpg	85720126090	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Tegal	Mandiri	MDR02	1	50
YKSN031	6282112103335	/uploads/YKSN031_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN031_idcard.jpg	82112103335	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pekalongan	Mandiri	MDR02	2	50
YKSN032	6285714520393	/uploads/YKSN032_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN032_idcard.jpg	85714520393	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Semarang	Mandiri	MDR02	4	50
YKSN034	6285695565863	/uploads/YKSN034_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN034_idcard.jpg	85695565863	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Semarang	Mandiri	MDR02	4	50
YKSN035	6285781218594	/uploads/YKSN035_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN035_idcard.jpg	85781218594	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Semarang	Mandiri	MDR02	1	50
YKSN036	6288295024361	/uploads/YKSN036_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN036_idcard.jpg	88295024361	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Demak	Mandiri	MDR02	4	50
YKSN063	6289691090699	/uploads/YKSN063_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN063_idcard.jpg	89691090699	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Tegal	Taspen	TPN02	4	40
YKSN064	628151660009	/uploads/YKSN064_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN064_idcard.jpg	8151660009	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pekalongan	Taspen	TPN02	3	40
YKSN066	6281329161145	/uploads/YKSN066_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN066_idcard.jpg	81329161145	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Semarang	Taspen	TPN02	3	40
YKSN067	6282112352169	/uploads/YKSN067_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN067_idcard.jpg	82112352169	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Semarang	Taspen	TPN02	3	40
YKSN068	6285223017011	/uploads/YKSN068_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN068_idcard.jpg	85223017011	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Kudus	Taspen	TPN02	1	40
YKSN069	6285348092354	/uploads/YKSN069_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN069_idcard.jpg	85348092354	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Kudus	Taspen	TPN02	1	40
YKSN079	6283872864542	/uploads/YKSN079_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN079_idcard.jpg	83872864542	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Banjarnegara	Mandiri	MDR03	1	50
YKSN080	6285726163491	/uploads/YKSN080_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN080_idcard.jpg	85726163491	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Banjarnegara	Mandiri	MDR03	4	50
YKSN081	6281314727642	/uploads/YKSN081_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN081_idcard.jpg	81314727642	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Wonosobo	Mandiri	MDR03	4	50
YKSN082	6281575136352	/uploads/YKSN082_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN082_idcard.jpg	81575136352	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Wonosobo	Mandiri	MDR03	1	50
YKSN083	6287741669254	/uploads/YKSN083_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN083_idcard.jpg	87741669254	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Wonosobo	Mandiri	MDR03	4	50
YKSN084	6287879224461	/uploads/YKSN084_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN084_idcard.jpg	87879224461	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Wonosobo	Mandiri	MDR03	4	50
YKSN085	6285311975525	/uploads/YKSN085_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN085_idcard.jpg	85311975525	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Temanggung	Mandiri	MDR03	4	50
YKSN026	6283873614612	/uploads/YKSN026_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN026_idcard.jpg	83873614612	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Tegal	Mandiri	MDR02	3	50
YKSN070	6285669761334	/uploads/YKSN070_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN070_idcard.png	85669761334	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pati	Taspen	TPN02	1	40
YKSN071	6285179660281	/uploads/YKSN071_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN071_idcard.jpg	85179660281	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pati	Taspen	TPN02	4	40
YKSN072	6282235466052	/uploads/YKSN072_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN072_idcard.jpg	82235466052	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Lamongan	Taspen	TPN02	3	40
YKSN073	6281196916969	/uploads/YKSN073_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN073_idcard.jpg	81196916969	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Taspen	TPN02	4	40
YKSN037	628568446526	/uploads/YKSN037_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN037_idcard.jpg	8568446526	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Kudus	Mandiri	MDR02	2	50
YKSN038	6288215020511	/uploads/YKSN038_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN038_idcard.jpg	88215020511	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pati	Mandiri	MDR02	1	50
YKSN039	6285311872858	/uploads/YKSN039_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN039_idcard.jpg	85311872858	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pati	Mandiri	MDR02	2	50
YKSN040	6281311896811	/uploads/YKSN040_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN040_idcard.jpg	81311896811	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pati	Mandiri	MDR02	2	50
YKSN041	6281517732125	/uploads/YKSN041_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN041_idcard.jpg	81517732125	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pati	Mandiri	MDR02	4	50
YKSN074	6281334275798	/uploads/YKSN074_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN074_idcard.jpg	81334275798	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Taspen	TPN02	4	40
YKSN076	6281315826667	/uploads/YKSN076_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN076_idcard.jpg	81315826667	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Cirebon	Mandiri	MDR03	4	50
YKSN077	6285770158226	/uploads/YKSN077_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN077_idcard.jpg	85770158226	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Purwokerto	Mandiri	MDR03	3	50
YKSN078	6281317607023	/uploads/YKSN078_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN078_idcard.jpg	81317607023	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Purwokerto	Mandiri	MDR03	2	50
YKSN086	628118686339	/uploads/YKSN086_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN086_idcard.jpg	8118686339	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Temanggung	Mandiri	MDR03	3	50
YKSN087	6285604217797	/uploads/YKSN087_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN087_idcard.jpg	85604217797	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Temanggung	Mandiri	MDR03	1	50
YKSN305	62895337000000	/uploads/YKSN305_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN305_idcard.jpg	8.95337E+11	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Temanggung	Mandiri	MDR03	1	50
YKSN306	6285311975525	/uploads/YKSN306_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN306_idcard.jpg	85311975525	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Temanggung	Mandiri	MDR03	1	50
YKSN088	6281585610187	/uploads/YKSN088_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN088_idcard.jpg	81585610187	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Solo	Mandiri	MDR03	3	50
YKSN089	6289625895207	/uploads/YKSN089_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN089_idcard.jpg	89625895207	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Solo	Mandiri	MDR03	1	50
YKSN090	6285868793995	/uploads/YKSN090_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN090_idcard.jpg	85868793995	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Solo	Mandiri	MDR03	1	50
YKSN091	6281218618646	/uploads/YKSN091_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN091_idcard.jpg	81218618646	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Solo	Mandiri	MDR03	2	50
YKSN092	6281328823606	/uploads/YKSN092_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN092_idcard.jpg	81328823606	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Solo	Mandiri	MDR03	2	50
YKSN093	6282138165821	/uploads/YKSN093_kk.png	2026-03-09 01:01:20.509308	/uploads/YKSN093_idcard.jpg	82138165821	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Solo	Mandiri	MDR03	1	50
YKSN095	6285280442623	/uploads/YKSN095_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN095_idcard.jpg	85280442623	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Solo	Mandiri	MDR03	2	50
YKSN097	6285819631499	/uploads/YKSN097_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN097_idcard.jpg	85819631499	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Banjarnegara	BNI	BNI01	3	40
YKSN098	6281316152241	/uploads/YKSN098_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN098_idcard.jpg	81316152241	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Banjarnegara	BNI	BNI01	4	40
YKSN099	6283896733661	/uploads/YKSN099_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN099_idcard.jpg	83896733661	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Wonosobo	BNI	BNI01	3	40
YKSN075	6282124193952	/uploads/YKSN075_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN075_idcard.jpg	82124193952	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Cirebon	Mandiri	MDR03	1	50
YKSN042	6281399180054	/uploads/YKSN042_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN042_idcard.jpg	81399180054	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Tuban	Mandiri	MDR02	1	50
YKSN043	6285331460490	/uploads/YKSN043_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN043_idcard.jpg	85331460490	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Mandiri	MDR02	2	50
YKSN044	6281329327971	/uploads/YKSN044_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN044_idcard.jpg	81329327971	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Mandiri	MDR02	1	50
YKSN045	6281333808485	/uploads/YKSN045_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN045_idcard.jpg	81333808485	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Mandiri	MDR02	1	50
YKSN046	6285333609396	/uploads/YKSN046_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN046_idcard.jpg	85333609396	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Mandiri	MDR02	1	50
YKSN100	6281385826323	/uploads/YKSN100_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN100_idcard.jpg	81385826323	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Wonosobo	BNI	BNI01	3	40
YKSN267	6281295916344	/uploads/YKSN267_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN267_idcard.jpg	81295916344	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Wonosobo	BNI	BNI01	1	40
YKSN103	628121073212	/uploads/YKSN103_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN103_idcard.jpg	8121073212	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Solo	BNI	BNI01	3	40
YKSN104	6281316435825	/uploads/YKSN104_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN104_idcard.jpg	81316435825	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Solo	BNI	BNI01	4	40
YKSN105	6283834826519	/uploads/YKSN105_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN105_idcard.png	83834826519	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Solo	BNI	BNI01	1	40
YKSN308	6281310865567	/uploads/YKSN308_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN308_idcard.jpg	81310865567	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Wonosobo	BNI	BNI01	1	40
YKSN309	6281210006545	/uploads/YKSN309_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN309_idcard.jpg	81210006545	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Solo	BNI	BNI01	4	40
YKSN107	6281381226192	/uploads/YKSN107_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN107_idcard.jpg	81381226192	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Solo	BNI	BNI01	4	40
YKSN294	6281381226192	/uploads/YKSN294_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN294_idcard.jpg	81381226192	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Solo	BNI	BNI01	1	40
YKSN109	6287734261776	/uploads/YKSN109_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN109_idcard.jpg	87734261776	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Semarang	Mandiri	MDR04	1	50
YKSN110	62895387291223	/uploads/YKSN110_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN110_idcard.jpg	895387291223	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Semarang	Mandiri	MDR04	1	50
YKSN112	6281387007282	/uploads/YKSN112_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN112_idcard.jpg	81387007282	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Salatiga	Mandiri	MDR04	4	50
YKSN113	6285282228778	/uploads/YKSN113_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN113_idcard.jpg	85282228778	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Salatiga	Mandiri	MDR04	4	50
YKSN114	6281575686204	/uploads/YKSN114_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN114_idcard.jpg	81575686204	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Salatiga	Mandiri	MDR04	2	50
YKSN115	6285319559912	/uploads/YKSN115_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN115_idcard.jpg	85319559912	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	Mandiri	MDR04	4	50
YKSN116	6285212336580	/uploads/YKSN116_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN116_idcard.jpg	85212336580	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	Mandiri	MDR04	3	50
YKSN117	6287888057642	/uploads/YKSN117_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN117_idcard.jpg	87888057642	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	Mandiri	MDR04	4	50
YKSN118	6282130599021	/uploads/YKSN118_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN118_idcard.jpg	82130599021	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	Mandiri	MDR04	4	50
YKSN119	6281477118542	/uploads/YKSN119_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN119_idcard.jpg	81477118542	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	Mandiri	MDR04	4	50
YKSN120	6281286147218	/uploads/YKSN120_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN120_idcard.jpg	81286147218	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	Mandiri	MDR04	4	50
YKSN121	6282310664219	/uploads/YKSN121_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN121_idcard.jpg	82310664219	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Pacitan	Mandiri	MDR04	4	50
YKSN122	6281314874669	/uploads/YKSN122_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN122_idcard.jpg	81314874669	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Pacitan	Mandiri	MDR04	4	50
YKSN124	6281282815143	/uploads/YKSN124_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN124_idcard.jpg	81282815143	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Salatiga	BNI	BNI02	3	40
YKSN125	6282136391917	/uploads/YKSN125_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN125_idcard.jpg	82136391917	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Salatiga	BNI	BNI02	4	40
YKSN127	6281331337713	/uploads/YKSN127_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN127_idcard.jpg	81331337713	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Karanganyar	BNI	BNI02	1	40
YKSN128	6285742983415	/uploads/YKSN128_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN128_idcard.jpg	85742983415	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Karanganyar	BNI	BNI02	2	40
YKSN129	6282133330109	/uploads/YKSN129_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN129_idcard.jpg	82133330109	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	BNI	BNI02	3	40
YKSN130	6281295788400	/uploads/YKSN130_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN130_idcard.jpg	81295788400	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	BNI	BNI02	4	40
YKSN131	6281292945917	/uploads/YKSN131_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN131_idcard.jpg	81292945917	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	BNI	BNI02	4	40
YKSN132	6287886893115	/uploads/YKSN132_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN132_idcard.jpg	87886893115	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	BNI	BNI02	2	40
YKSN133	6287885163565	/uploads/YKSN133_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN133_idcard.jpg	87885163565	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	BNI	BNI02	2	40
YKSN141	6287892029389	/uploads/YKSN141_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN141_idcard.jpg	87892029389	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Karanganyar	BNI	BNI03	1	40
YKSN142	6288238340379	/uploads/YKSN142_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN142_idcard.jpg	88238340379	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Karanganyar	BNI	BNI03	1	40
YKSN143	6281215216178	/uploads/YKSN143_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN143_idcard.jpg	81215216178	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	BNI	BNI03	1	40
YKSN144	6282123882426	/uploads/YKSN144_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN144_idcard.jpg	82123882426	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	BNI	BNI03	3	40
YKSN145	6289602855223	/uploads/YKSN145_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN145_idcard.jpg	89602855223	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	BNI	BNI03	3	40
YKSN047	6283892997200	/uploads/YKSN047_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN047_idcard.jpg	83892997200	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Mandiri	MDR02	2	50
YKSN048	6285715844706	/uploads/YKSN048_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN048_idcard.jpg	85715844706	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Mandiri	MDR02	1	50
YKSN050	628997444442	/uploads/YKSN050_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN050_idcard.jpg	8997444442	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Tegal	Taspen	TPN01	4	40
YKSN051	6281384309942	/uploads/YKSN051_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN051_idcard.jpg	81384309942	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pekalongan	Taspen	TPN01	4	40
YKSN146	6281515682400	/uploads/YKSN146_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN146_idcard.jpg	81515682400	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	BNI	BNI03	1	40
YKSN147	6281390054880	/uploads/YKSN147_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN147_idcard.jpg	81390054880	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	BNI	BNI03	1	40
YKSN148	628557071669	/uploads/YKSN148_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN148_idcard.jpg	8557071669	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	BNI	BNI03	2	40
YKSN149	6282143960187	/uploads/YKSN149_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN149_idcard.jpg	82143960187	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Pacitan	BNI	BNI03	3	40
YKSN150	6285745898286	/uploads/YKSN150_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN150_idcard.jpg	85745898286	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Pacitan	BNI	BNI03	4	40
YKSN094	6285894974300	/uploads/YKSN094_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN094_idcard.jpg	85894974300	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Wonogiri	BNI	BNI02	2	40
YKSN134	6287758825642	/uploads/YKSN134_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN134_idcard.jpg	87758825642	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Pacitan	BNI	BNI02	3	40
YKSN303	6285695032710	/uploads/YKSN303_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN303_idcard.jpg	85695032710	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Pacitan	BNI	BNI02	2	40
YKSN135	6285693343407	/uploads/YKSN135_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN135_idcard.jpg	85693343407	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Pacitan	BNI	BNI02	4	40
YKSN138	6285175188271	/uploads/YKSN138_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN138_idcard.jpg	85175188271	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Salatiga	BNI	BNI03	4	40
YKSN139	6285311272745	/uploads/YKSN139_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN139_idcard.jpg	85311272745	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Salatiga	BNI	BNI03	4	40
YKSN140	6281234747689	/uploads/YKSN140_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN140_idcard.jpg	81234747689	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Salatiga	BNI	BNI03	4	40
YKSN304	6283195248488	/uploads/YKSN304_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN304_idcard.jpg	83195248488	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Pacitan	BNI	BNI03	1	40
YKSN151	6285714445221	/uploads/YKSN151_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN151_idcard.jpg	85714445221	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Pacitan	BNI	BNI03	4	40
YKSN153	6281319162050	/uploads/YKSN153_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN153_idcard.jpg	81319162050	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Purwokerto	Mandiri	MDR05	4	49
YKSN154	6281542803755	/uploads/YKSN154_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN154_idcard.jpg	81542803755	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Purwokerto	Mandiri	MDR05	4	49
YKSN155	6287772950517	/uploads/YKSN155_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN155_idcard.jpg	87772950517	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Purwokerto	Mandiri	MDR05	4	49
YKSN049	6288983365978	/uploads/YKSN049_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN049_idcard.jpg	88983365978	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Tegal	Taspen	TPN01	1	40
YKSN184	6282299637208	/uploads/YKSN184_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN184_idcard.jpg	82299637208	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Madiun	Mandiri	MDR06	1	50
YKSN318	6282143960187	/uploads/YKSN318_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN318_idcard.jpg	82143960187	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Pacitan	Mandiri	MDR05	1	49
YKSN302	62878055000000	/uploads/YKSN302_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN302_idcard.jpg	8.78055E+11	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Cirebon	Mandiri	MDR06	1	50
YKSN175	6285293900293	/uploads/YKSN175_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN175_idcard.jpg	85293900293	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Tegal	Mandiri	MDR06	1	50
YKSN176	6285782261002	/uploads/YKSN176_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN176_idcard.jpg	85782261002	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Tegal	Mandiri	MDR06	3	50
YKSN178	6282249008626	/uploads/YKSN178_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN178_idcard.jpg	82249008626	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Kebumen	Mandiri	MDR06	4	50
YKSN179	6285157477817	/uploads/YKSN179_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN179_idcard.jpg	85157477817	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Yogyakarta	Mandiri	MDR06	3	50
YKSN180	6287737557305	/uploads/YKSN180_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN180_idcard.jpg	0877-3755-7305	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Yogyakarta	Mandiri	MDR06	1	50
YKSN182	6285865863448	/uploads/YKSN182_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN182_idcard.jpg	85865863448	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Klaten	Mandiri	MDR06	1	50
YKSN183	6285730697219	/uploads/YKSN183_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN183_idcard.jpg	85730697219	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Solo	Mandiri	MDR06	1	50
YKSN185	6287758969461	/uploads/YKSN185_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN185_idcard.jpg	87758969461	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Madiun	Mandiri	MDR06	2	50
YKSN186	62895326000000	/uploads/YKSN186_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN186_idcard.jpg	8.95326E+11	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Madiun	Mandiri	MDR06	2	50
YKSN187	6281357049872	/uploads/YKSN187_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN187_idcard.jpg	81357049872	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Madiun	Mandiri	MDR06	4	50
YKSN188	6285311227099	/uploads/YKSN188_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN188_idcard.jpg	85311227099	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Madiun	Mandiri	MDR06	4	50
YKSN189	6285776224133	/uploads/YKSN189_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN189_idcard.jpg	85776224133	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Madiun	Mandiri	MDR06	1	50
YKSN156	6282110004054	/uploads/YKSN156_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN156_idcard.jpg	82110004054	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Purwokerto	Mandiri	MDR05	1	49
YKSN157	6281399514605	/uploads/YKSN157_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN157_idcard.jpg	081399514605	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Purwokerto	Mandiri	MDR05	2	49
YKSN158	6281399514605	/uploads/YKSN158_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN158_idcard.jpg	081399514605	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Purwokerto	Mandiri	MDR05	3	49
YKSN296	6281399514605	/uploads/YKSN296_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN296_idcard.jpg	81399514605	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Purwokerto	Mandiri	MDR05	2	49
YKSN159	6287888099165	/uploads/YKSN159_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN159_idcard.jpg	87888099165	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Purwokerto	Mandiri	MDR05	3	49
YKSN160	6285647320703	/uploads/YKSN160_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN160_idcard.jpg	85647320703	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Purwokerto	Mandiri	MDR05	1	49
YKSN161	6288983550199	/uploads/YKSN161_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN161_idcard.jpg	88983550199	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Purwokerto	Mandiri	MDR05	1	49
YKSN162	6287786227009	/uploads/YKSN162_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN162_idcard.jpg	87786227009	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Purwokerto	Mandiri	MDR05	1	49
YKSN163	6287797664258	/uploads/YKSN163_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN163_idcard.jpg	87797664258	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Purwokerto	Mandiri	MDR05	1	49
YKSN164	628984355473	/uploads/YKSN164_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN164_idcard.jpg	8984355473	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Purwokerto	Mandiri	MDR05	2	49
YKSN212	6281299221339	/uploads/YKSN212_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN212_idcard.jpg	81299221339	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Tegal	BNI	BNI04	2	40
YKSN213	6285921202041	/uploads/YKSN213_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN213_idcard.jpg	85921202041	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Tegal	BNI	BNI04	4	40
YKSN214	6283878777890	/uploads/YKSN214_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN214_idcard.jpg	83878777890	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Kebumen	BNI	BNI04	2	40
YKSN215	6289673140654	/uploads/YKSN215_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN215_idcard.jpg	89673140654	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Kebumen	BNI	BNI04	2	40
YKSN216	6281231713638	/uploads/YKSN216_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN216_idcard.jpg	81231713638	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Yogyakarta	BNI	BNI04	4	40
YKSN210	6283898822370	/uploads/YKSN210_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN210_idcard.jpg	83898822370	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Nganjuk	Taspen	TPN03	4	40
YKSN217	6287787988841	/uploads/YKSN217_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN217_idcard.jpg	87787988841	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Yogyakarta	BNI	BNI04	3	40
YKSN218	6285880278700	/uploads/YKSN218_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN218_idcard.jpg	85880278700	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Klaten	BNI	BNI04	3	40
YKSN300	6285869622262	/uploads/YKSN300_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN300_idcard.jpg	85869622262	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Klaten	BNI	BNI04	1	40
YKSN219	6285774538381	/uploads/YKSN219_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN219_idcard.jpg	85774538381	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Solo	BNI	BNI04	4	40
YKSN220	6281806117001	/uploads/YKSN220_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN220_idcard.jpg	81806117001	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Madiun	BNI	BNI04	2	40
YKSN221	6281906364662	/uploads/YKSN221_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN221_idcard.jpg	81906364662	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Madiun	BNI	BNI04	2	40
YKSN222	6283845335473	/uploads/YKSN222_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN222_idcard.jpg	83845335473	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Madiun	BNI	BNI04	2	40
YKSN223	6281381355612	/uploads/YKSN223_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN223_idcard.jpg	81381355612	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Madiun	BNI	BNI04	2	40
YKSN165	6282122841070	/uploads/YKSN165_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN165_idcard.jpg	82122841070	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Purwokerto	Mandiri	MDR05	1	49
YKSN166	6285840018180	/uploads/YKSN166_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN166_idcard.jpg	85840018180	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Purwokerto	Mandiri	MDR05	2	49
YKSN177	6287881423768	/uploads/YKSN177_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN177_idcard.jpg	87881423768	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Kebumen	Mandiri	MDR05	3	49
YKSN167	628990015183	/uploads/YKSN167_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN167_idcard.jpg	8990015183	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Kebumen	Mandiri	MDR05	1	49
YKSN168	6282243001488	/uploads/YKSN168_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN168_idcard.jpg	82243001488	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Kebumen	Mandiri	MDR05	1	49
YKSN169	6281586218837	/uploads/YKSN169_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN169_idcard.jpg	81586218837	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Kebumen	Mandiri	MDR05	1	49
YKSN170	6281318189378	/uploads/YKSN170_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN170_idcard.jpg	81318189378	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Kebumen	Mandiri	MDR05	1	49
YKSN172	6282122025355	/uploads/YKSN172_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN172_idcard.jpg	82122025355	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Yogyakarta	Mandiri	MDR05	4	49
YKSN173	6287836601797	/uploads/YKSN173_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN173_idcard.jpg	87836601797	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Yogyakarta	Mandiri	MDR05	1	49
YKSN317	6285212599939	/uploads/YKSN317_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN317_idcard.jpg	85212599939	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Pacitan	Mandiri	MDR05	3	49
YKSN190	6285774988412	/uploads/YKSN190_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN190_idcard.jpg	85774988412	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Nganjuk	Mandiri	MDR06	4	50
YKSN191	6285298228123	/uploads/YKSN191_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN191_idcard.jpg	85298228123	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Nganjuk	Mandiri	MDR06	1	50
YKSN211	6285701476764	/uploads/YKSN211_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN211_idcard.jpg	85701476764	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Tegal	BNI	BNI04	1	40
YKSN255	628159778373	/uploads/YKSN255_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN255_idcard.jpg	8159778373	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Yogyakarta	Taspen	TPN04	3	39
YKSN247	6285288349884	/uploads/YKSN247_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN247_idcard.jpg	85288349884	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Tasikmalaya	Taspen	TPN04	4	39
YKSN248	6289508040898	/uploads/YKSN248_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN248_idcard.jpg	89508040898	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Cilacap	Taspen	TPN04	1	39
YKSN249	6281908180406	/uploads/YKSN249_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN249_idcard.jpg	81908180406	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Cilacap	Taspen	TPN04	4	39
YKSN250	6281297327446	/uploads/YKSN250_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN250_idcard.jpg	81297327446	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Cilacap	Taspen	TPN04	4	39
YKSN251	6285215890259	/uploads/YKSN251_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN251_idcard.jpg	85215890259	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Purworejo	Taspen	TPN04	1	39
YKSN252	6285268211435	/uploads/YKSN252_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN252_idcard.jpg	85268211435	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Purworejo	Taspen	TPN04	1	39
YKSN253	6287804044207	/uploads/YKSN253_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN253_idcard.jpg	87804044207	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Purworejo	Taspen	TPN04	4	39
YKSN254	6281218575349	/uploads/YKSN254_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN254_idcard.jpg	81218575349	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Purworejo	Taspen	TPN04	3	39
YKSN256	6289525895488	/uploads/YKSN256_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN256_idcard.jpg	89525895488	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Yogyakarta	Taspen	TPN04	4	39
YKSN257	6287809397566	/uploads/YKSN257_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN257_idcard.jpg	87809397566	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Yogyakarta	Taspen	TPN04	4	39
YKSN258	6287839104314	/uploads/YKSN258_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN258_idcard.jpg	87839104314	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Yogyakarta	Taspen	TPN04	4	39
YKSN261	628127959953	/uploads/YKSN261_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN261_idcard.jpg	8127959953	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Banjar	Taspen	TPN05	3	38
YKSN298	6281808711325	/uploads/YKSN298_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN298_idcard.jpg	81808711325	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Sidoarjo	Mandiri	MDR06	4	50
YKSN299	6285267639300	/uploads/YKSN299_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN299_idcard.jpg	85267639300	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Sidoarjo	Mandiri	MDR06	1	50
YKSN319	6285740664822	/uploads/YKSN319_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN319_idcard.jpg	85740664822	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Sidoarjo	Mandiri	MDR06	1	50
YKSN192	6281333567807	/uploads/YKSN192_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN192_idcard.jpg	81333567807	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Malang	Mandiri	MDR06	1	50
YKSN193	6281357496366	/uploads/YKSN193_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN193_idcard.jpg	81357496366	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Malang	Mandiri	MDR06	1	50
YKSN195	6282299229123	/uploads/YKSN195_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN195_idcard.jpg	82299229123	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Malang	Mandiri	MDR06	3	50
YKSN196	6281528862912	/uploads/YKSN196_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN196_idcard.jpg	81528862912	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Malang	Mandiri	MDR06	1	50
YKSN198	6287877881033	/uploads/YKSN198_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN198_idcard.jpg	87877881033	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Tegal	Taspen	TPN03	2	40
YKSN199	6285212580339	/uploads/YKSN199_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN199_idcard.jpg	85212580339	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Tegal	Taspen	TPN03	4	40
YKSN200	6281211835549	/uploads/YKSN200_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN200_idcard.jpg	81211835549	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Kebumen	Taspen	TPN03	3	40
YKSN301	6281391109367	/uploads/YKSN301_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN301_idcard.jpg	81391109367	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Kebumen	Taspen	TPN03	4	40
YKSN202	6282137671098	/uploads/YKSN202_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN202_idcard.jpg	82137671098	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Yogyakarta	Taspen	TPN03	1	40
YKSN246	6281932853983	/uploads/YKSN246_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN246_idcard.jpg	81932853983	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Tasikmalaya	Taspen	TPN04	2	39
YKSN259	6289606229528	/uploads/YKSN259_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN259_idcard.jpg	89606229528	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Tasikmalaya	Taspen	TPN05	1	38
YKSN285	62859188000000	/uploads/YKSN285_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN285_idcard.jpg	8.59188E+11	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Kebumen	BNI	BNI05	1	39
YKSN268	6282124798359	/uploads/YKSN268_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN268_idcard.jpg	82124798359	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Purworejo	BNI	BNI05	4	39
YKSN287	6287888550063	/uploads/YKSN287_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN287_idcard.jpg	87888550063	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Purworejo	BNI	BNI05	1	39
YKSN288	6282144009185	/uploads/YKSN288_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN288_idcard.jpg	82144009185	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Purworejo	BNI	BNI05	2	39
YKSN289	6282310998544	/uploads/YKSN289_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN289_idcard.jpg	82310998544	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Purworejo	BNI	BNI05	2	39
YKSN244	6281310060174	/uploads/YKSN244_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN244_idcard.jpg	81310060174	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Yogyakarta	BNI	BNI05	3	39
YKSN290	6285694891155	/uploads/YKSN290_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN290_idcard.jpg	85694891155	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Yogyakarta	BNI	BNI05	4	39
YKSN293	6285694891155	/uploads/YKSN293_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN293_idcard.jpg	85694891155	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Yogyakarta	BNI	BNI05	1	39
YKSN291	6289658087941	/uploads/YKSN291_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN291_idcard.jpg	89658087941	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Yogyakarta	BNI	BNI05	1	39
YKSN292	6283874534090	/uploads/YKSN292_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN292_idcard.jpg	83874534090	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Yogyakarta	BNI	BNI05	1	39
YKSN061	6281318819725	/uploads/YKSN061_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN061_idcard.jpg	81318819725	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Tegal	Taspen	TPN02	4	40
YKSN052	6281915900500	/uploads/YKSN052_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN052_idcard.jpg	81915900500	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Kendal	Taspen	TPN01	4	40
YKSN053	6282165506853	/uploads/YKSN053_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN053_idcard.jpg	82165506853	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Semarang	Taspen	TPN01	3	40
YKSN054	6285801358510	/uploads/YKSN054_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN054_idcard.jpg	85801358510	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Demak	Taspen	TPN01	2	40
YKSN055	6281251514788	/uploads/YKSN055_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN055_idcard.jpg	81251514788	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Kudus	Taspen	TPN01	4	40
YKSN056	6281383839070	/uploads/YKSN056_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN056_idcard.jpg	81383839070	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Pati	Taspen	TPN01	4	40
YKSN057	628388118565	/uploads/YKSN057_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN057_idcard.jpg	8388118565	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Tuban	Taspen	TPN01	4	40
YKSN058	6281918794973	/uploads/YKSN058_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN058_idcard.jpg	81918794973	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Surabaya	Taspen	TPN01	4	40
YKSN307	6285817893400	/uploads/YKSN307_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN307_idcard.jpg	85817893400	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Cirebon	BNI	BNI01	4	40
YKSN108	6281213596272	/uploads/YKSN108_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN108_idcard.jpg	81213596272	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Pemalang	Mandiri	MDR04	4	50
YKSN065	62895359496250	/uploads/YKSN065_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN065_idcard.jpg	895359496250	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Kendal	Taspen	TPN02	1	40
YKSN096	628567208393	/uploads/YKSN096_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN096_idcard.jpg	8567208393	t	2026-03-09 01:01:20.509308	Solo via Wonosobo	Purwokerto	BNI	BNI01	4	40
YKSN033	6282243423161	/uploads/YKSN033_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN033_idcard.jpg	82243423161	t	2026-03-09 01:01:20.509308	Surabaya via Pantura	Semarang	Mandiri	MDR02	4	50
YKSN136	6281212567845	/uploads/YKSN136_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN136_idcard.jpg	81212567845	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Semarang	Mandiri	MDR04	3	50
YKSN123	6282111999831	/uploads/YKSN123_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN123_idcard.jpg	82111999831	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Semarang	BNI	BNI02	4	40
YKSN111	6281219905485	/uploads/YKSN111_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN111_idcard.jpg	81219905485	t	2026-03-09 01:01:20.509308	Pacitan via Wonogiri	Salatiga	BNI	BNI03	3	40
YKSN152	6285770176445	/uploads/YKSN152_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN152_idcard.jpg	85770176445	t	2026-03-09 01:01:20.509308	Pacitan via Selatan	Cirebon	Mandiri	MDR05	1	49
YKSN174	6285695154738	/uploads/YKSN174_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN174_idcard.jpg	85695154738	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Cirebon	Mandiri	MDR06	4	50
YKSN197	6285339450213	/uploads/YKSN197_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN197_idcard.jpg	85339450213	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Tegal	Taspen	TPN03	1	40
YKSN310	6281219381804	/uploads/YKSN310_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN310_idcard.jpg	81219381804	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Tasikmalaya	Mandiri	MDR07	4	50
YKSN276	6285156931649	/uploads/YKSN276_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN276_idcard.jpg	85156931649	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Bandung	BNI	BNI05	1	39
YKSN204	6285725581104	/uploads/YKSN204_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN204_idcard.jpg	85725581104	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Klaten	Taspen	TPN03	3	40
YKSN316	628997444442	/uploads/YKSN316_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN316_idcard.jpg	8997444442	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Tegal	Taspen	TPN03	2	40
YKSN205	6281288601707	/uploads/YKSN205_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN205_idcard.jpg	81288601707	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Solo	Taspen	TPN03	4	40
YKSN207	6281292428226	/uploads/YKSN207_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN207_idcard.jpg	81292428226	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Madiun	Taspen	TPN03	4	40
YKSN208	6285707642064	/uploads/YKSN208_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN208_idcard.jpg	85707642064	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Madiun	Taspen	TPN03	2	40
YKSN297	6285811924986	/uploads/YKSN297_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN297_idcard.jpg	85811924986	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Madiun	Taspen	TPN03	3	40
YKSN209	6281283045218	/uploads/YKSN209_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN209_idcard.jpg	81283045218	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Nganjuk	Taspen	TPN03	3	40
YKSN224	6285784021037	/uploads/YKSN224_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN224_idcard.jpg	85784021037	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Malang	BNI	BNI04	1	40
YKSN225	6289517487317	/uploads/YKSN225_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN225_idcard.jpg	89517487317	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Malang	BNI	BNI04	4	40
YKSN226	6281389913113	/uploads/YKSN226_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN226_idcard.jpg	81389913113	t	2026-03-09 01:01:20.509308	Malang via Yogyakarta	Malang	BNI	BNI04	1	40
YKSN228	6281280142104	/uploads/YKSN228_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN228_idcard.jpg	81280142104	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Banjar	Mandiri	MDR07	4	50
YKSN311	6285790622237	/uploads/YKSN311_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN311_idcard.jpg	85790622237	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Banjar	Mandiri	MDR07	3	50
YKSN229	6282126011657	/uploads/YKSN229_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN229_idcard.jpg	82126011657	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Cilacap	Mandiri	MDR07	4	50
YKSN230	6282128908387	/uploads/YKSN230_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN230_idcard.jpg	82128908387	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Cilacap	Mandiri	MDR07	1	50
YKSN231	6281310218820	/uploads/YKSN231_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN231_idcard.jpg	81310218820	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Cilacap	Mandiri	MDR07	4	50
YKSN233	6285770781127	/uploads/YKSN233_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN233_idcard.jpg	85770781127	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Cilacap	Mandiri	MDR07	2	50
YKSN234	6282337815068	/uploads/YKSN234_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN234_idcard.jpg	82337815068	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Cilacap	Mandiri	MDR07	1	50
YKSN235	6285729143649	/uploads/YKSN235_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN235_idcard.jpg	85729143649	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Cilacap	Mandiri	MDR07	1	50
YKSN312	6282114519966	/uploads/YKSN312_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN312_idcard.jpg	82114519966	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Cilacap	Mandiri	MDR07	3	50
YKSN313	6281338098630	/uploads/YKSN313_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN313_idcard.jpg	81338098630	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Kebumen	Mandiri	MDR07	1	50
YKSN236	6281313916620	/uploads/YKSN236_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN236_idcard.jpg	81313916620	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Kebumen	Mandiri	MDR07	4	50
YKSN237	6285727294927	/uploads/YKSN237_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN237_idcard.jpg	85727294927	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Kebumen	Mandiri	MDR07	4	50
YKSN239	6281212021232	/uploads/YKSN239_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN239_idcard.jpg	81212021232	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Kebumen	Mandiri	MDR07	1	50
YKSN240	6288211562230	/uploads/YKSN240_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN240_idcard.jpg	88211562230	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Purworejo	Mandiri	MDR07	4	50
YKSN241	628128239454	/uploads/YKSN241_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN241_idcard.jpg	8128239454	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Purworejo	Mandiri	MDR07	1	50
YKSN242	628161848091	/uploads/YKSN242_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN242_idcard.jpg	8161848091	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Purworejo	Mandiri	MDR07	2	50
YKSN314	6282282560574	/uploads/YKSN314_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN314_idcard.jpg	82282560574	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Yogyakarta	Mandiri	MDR07	4	50
YKSN245	6281385279643	/uploads/YKSN245_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN245_idcard.jpg	81385279643	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Yogyakarta	Mandiri	MDR07	2	50
YKSN260	6282116004918	/uploads/YKSN260_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN260_idcard.jpg	82116004918	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Tasikmalaya	Taspen	TPN05	1	38
YKSN262	6282114519966	/uploads/YKSN262_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN262_idcard.jpg	82114519966	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Cilacap	Taspen	TPN05	4	38
YKSN263	6289634674015	/uploads/YKSN263_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN263_idcard.jpg	89634674015	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Cilacap	Taspen	TPN05	4	38
YKSN264	6285886244174	/uploads/YKSN264_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN264_idcard.jpg	85886244174	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Cilacap	Taspen	TPN05	1	38
YKSN265	6281384005879	/uploads/YKSN265_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN265_idcard.jpg	81384005879	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Kebumen	Taspen	TPN05	3	38
YKSN266	6281338098630	/uploads/YKSN266_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN266_idcard.jpg	81338098630	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Kebumen	Taspen	TPN05	4	38
YKSN315	6281384005879	/uploads/YKSN315_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN315_idcard.jpg	81384005879	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Kebumen	Taspen	TPN05	2	38
YKSN286	6282261617998	/uploads/YKSN286_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN286_idcard.jpg	82261617998	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Purworejo	Taspen	TPN05	4	38
YKSN269	6289684824434	/uploads/YKSN269_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN269_idcard.jpg	89684824434	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Purworejo	Taspen	TPN05	3	38
YKSN270	6287878715815	/uploads/YKSN270_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN270_idcard.jpg	87878715815	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Purworejo	Taspen	TPN05	1	38
YKSN272	6282223420425	/uploads/YKSN272_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN272_idcard.jpg	0822-2342-0425	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Yogyakarta	Taspen	TPN05	1	38
YKSN273	6281717422221	/uploads/YKSN273_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN273_idcard.jpg	81717422221	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Yogyakarta	Taspen	TPN05	1	38
YKSN274	6289652645761	/uploads/YKSN274_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN274_idcard.png	89652645761	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Yogyakarta	Taspen	TPN05	1	38
YKSN275	6281809714492	/uploads/YKSN275_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN275_idcard.jpg	81809714492	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Yogyakarta	Taspen	TPN05	4	38
YKSN277	6281375658360	/uploads/YKSN277_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN277_idcard.jpg	81375658360	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Banjar	BNI	BNI05	2	39
YKSN279	6285756994595	/uploads/YKSN279_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN279_idcard.jpg	85756994595	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Cilacap	BNI	BNI05	2	39
YKSN280	6287776345065	/uploads/YKSN280_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN280_idcard.jpg	87776345065	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Cilacap	BNI	BNI05	3	39
YKSN281	6283863367084	/uploads/YKSN281_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN281_idcard.jpg	83863367084	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Cilacap	BNI	BNI05	4	39
YKSN282	6281918245204	/uploads/YKSN282_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN282_idcard.jpg	81918245204	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Kebumen	BNI	BNI05	3	39
YKSN283	6281280488481	/uploads/YKSN283_kk.jpg	2026-03-09 01:01:20.509308	/uploads/YKSN283_idcard.jpg	81280488481	t	2026-03-09 01:01:20.509308	Yogyakarta via Cilacap	Kebumen	BNI	BNI05	4	39
\.


--
-- Data for Name: sync_runs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sync_runs (id, started_at, finished_at, status, rows_read, rows_upserted, rows_skipped, error, created_at) FROM stdin;
1	2026-03-09 00:48:47.598941	\N	running	0	0	0	\N	2026-03-09 00:48:47.598941
2	2026-03-09 00:50:52.598715	\N	running	0	0	0	\N	2026-03-09 00:50:52.598715
3	2026-03-09 01:01:20.460526	2026-03-09 01:01:26.398858	success	299	742	0	\N	2026-03-09 01:01:20.460526
4	2026-03-09 01:13:16.217128	2026-03-09 01:28:33.860333	failed	0	0	0	aborted mid-run	2026-03-09 01:13:16.217128
5	2026-03-09 01:28:36.451855	\N	running	0	0	0	\N	2026-03-09 01:28:36.451855
6	2026-03-09 02:32:53.336803	\N	running	0	0	0	\N	2026-03-09 02:32:53.336803
\.


--
-- Name: admin_change_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_change_logs_id_seq', 1, false);


--
-- Name: app_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_users_id_seq', 4, true);


--
-- Name: passenger_verifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.passenger_verifications_id_seq', 34, true);


--
-- Name: passengers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.passengers_id_seq', 5692, true);


--
-- Name: sync_runs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sync_runs_id_seq', 6, true);


--
-- Name: admin_change_logs admin_change_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_change_logs
    ADD CONSTRAINT admin_change_logs_pkey PRIMARY KEY (id);


--
-- Name: app_users app_users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_email_key UNIQUE (email);


--
-- Name: app_users app_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);


--
-- Name: passenger_verifications passenger_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.passenger_verifications
    ADD CONSTRAINT passenger_verifications_pkey PRIMARY KEY (id);


--
-- Name: passengers passengers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.passengers
    ADD CONSTRAINT passengers_pkey PRIMARY KEY (id);


--
-- Name: registrants registrants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrants
    ADD CONSTRAINT registrants_pkey PRIMARY KEY (id);


--
-- Name: registrations registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT registrations_pkey PRIMARY KEY (id);


--
-- Name: sync_runs sync_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_runs
    ADD CONSTRAINT sync_runs_pkey PRIMARY KEY (id);


--
-- Name: passenger_verifications_passenger_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX passenger_verifications_passenger_idx ON public.passenger_verifications USING btree (passenger_id, verified_at DESC, id DESC);


--
-- Name: passengers_registration_slot_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX passengers_registration_slot_uidx ON public.passengers USING btree (registration_id, source_slot) WHERE (source_slot IS NOT NULL);


--
-- Name: passenger_verifications passenger_verifications_passenger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.passenger_verifications
    ADD CONSTRAINT passenger_verifications_passenger_id_fkey FOREIGN KEY (passenger_id) REFERENCES public.passengers(id) ON DELETE CASCADE;


--
-- Name: passengers passengers_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.passengers
    ADD CONSTRAINT passengers_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.registrations(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 2BrsSS2GxmCWzRc057na7pYTVRFRUubnt6Pdyc0HhGhYR9cy1loyMyIN2yFsGR5

