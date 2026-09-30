package main

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/mail"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

type product struct {
	ID       int    `json:"id"`
	Category string `json:"category"`
	Descr    string `json:"descr"`
	Img      string `json:"img"`
	Price    int    `json:"price"`
	Title    string `json:"title"`
}

type profile struct {
	FullName  string `json:"fullName"`
	Phone     string `json:"phone"`
	Street    string `json:"street"`
	House     string `json:"house"`
	Entrance  string `json:"entrance"`
	Floor     string `json:"floor"`
	Apartment string `json:"apartment"`
}

type orderItem struct {
	Item     product `json:"item"`
	Quantity int     `json:"quantity"`
}

type order struct {
	ID            int64       `json:"id"`
	Orders        []orderItem `json:"orders"`
	TotalAmount   int         `json:"totalAmount"`
	CustomerInfo  profile     `json:"customerInfo"`
	PaymentMethod string      `json:"paymentMethod"`
	Status        string      `json:"status"`
	Timestamp     time.Time   `json:"timestamp"`
}

type app struct {
	db       *sql.DB
	products []product
	byID     map[int]product
}

const sessionCookie = "shop_session"

func main() {
	dbPath := os.Getenv("SHOP_DB_PATH")
	if dbPath == "" {
		dbPath = filepath.Join("data", "shop.db")
	}
	if err := os.MkdirAll(filepath.Dir(dbPath), 0700); err != nil {
		log.Fatal(err)
	}
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(`PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL, profile_json TEXT NOT NULL DEFAULT '{}'
		);
		CREATE TABLE IF NOT EXISTS sessions (
			token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			expires_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS orders (
			id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			data_json TEXT NOT NULL, created_at TEXT NOT NULL
		);`); err != nil {
		log.Fatal(err)
	}
	products, err := loadProducts()
	if err != nil {
		log.Fatal(err)
	}
	a := &app{db: db, products: products, byID: make(map[int]product)}
	for _, p := range products {
		a.byID[p.ID] = p
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/products", a.getProducts)
	mux.HandleFunc("POST /api/auth/register", a.register)
	mux.HandleFunc("POST /api/auth/login", a.login)
	mux.HandleFunc("POST /api/auth/logout", a.logout)
	mux.HandleFunc("GET /api/me", a.getProfile)
	mux.HandleFunc("PUT /api/me", a.updateProfile)
	mux.HandleFunc("GET /api/orders", a.getOrders)
	mux.HandleFunc("POST /api/orders", a.createOrder)
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		jsonReply(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	if buildPath := os.Getenv("SHOP_BUILD_DIR"); buildPath != "" {
		mux.Handle("/", spaHandler(buildPath))
	}
	addr := os.Getenv("SHOP_ADDR")
	if addr == "" {
		addr = ":8080"
	}
	log.Printf("Go API listening on %s, %d products", addr, len(products))
	log.Fatal(http.ListenAndServe(addr, withHeaders(mux)))
}

func loadProducts() ([]product, error) {
	b, err := os.ReadFile(filepath.Join("data", "products.json"))
	if err != nil {
		return nil, err
	}
	var original map[string]product
	if err := json.Unmarshal(b, &original); err != nil {
		return nil, err
	}
	result := make([]product, 0, len(original))
	for _, p := range original {
		result = append(result, p)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].ID < result[j].ID })
	return result, nil
}

func withHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		if r.Method != http.MethodGet && r.Method != http.MethodHead && r.Method != http.MethodOptions {
			if origin := r.Header.Get("Origin"); origin != "" {
				u, err := url.Parse(origin)
				allowedDev := (r.Host == "localhost:8080" || r.Host == "127.0.0.1:8080") &&
					(origin == "http://localhost:3000" || origin == "http://127.0.0.1:3000")
				allowedExtra := origin == os.Getenv("SHOP_ALLOWED_ORIGIN") && origin != ""
				if err != nil || (u.Host != r.Host && !allowedDev && !allowedExtra) || (u.Scheme != "http" && u.Scheme != "https") {
					http.Error(w, "Forbidden", http.StatusForbidden)
					return
				}
			}
		}
		next.ServeHTTP(w, r)
	})
}

func jsonReply(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func jsonError(w http.ResponseWriter, status int, msg string) {
	jsonReply(w, status, map[string]string{"error": msg})
}

func decodeJSON(r *http.Request, dst any) error {
	if !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
		return errors.New("JSON required")
	}
	r.Body = http.MaxBytesReader(nil, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		return errors.New("extra or invalid data after JSON")
	}
	return nil
}

func (a *app) getProducts(w http.ResponseWriter, r *http.Request) {
	jsonReply(w, http.StatusOK, a.products)
}

type credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func normalizeEmail(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

func validEmail(s string) bool {
	a, err := mail.ParseAddress(s)
	return err == nil && a.Address == s && len(s) <= 254
}

func (a *app) register(w http.ResponseWriter, r *http.Request) {
	var c credentials
	if err := decodeJSON(r, &c); err != nil {
		jsonError(w, 400, "Invalid request")
		return
	}
	c.Email = normalizeEmail(c.Email)
	if !validEmail(c.Email) || len(c.Password) < 8 || len(c.Password) > 72 {
		jsonError(w, 400, "Enter an email and a password of 8 to 72 characters")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(c.Password), bcrypt.DefaultCost)
	if err != nil {
		jsonError(w, 500, "Registration failed")
		return
	}
	res, err := a.db.Exec(`INSERT INTO users(email,password_hash) VALUES(?,?)`, c.Email, string(hash))
	if err != nil {
		jsonError(w, 409, "Email is already in use")
		return
	}
	id, _ := res.LastInsertId()
	if err := a.newSession(w, r, id); err != nil {
		jsonError(w, 500, "Sign-in failed")
		return
	}
	jsonReply(w, 201, map[string]any{"email": c.Email, "profile": profile{}})
}

func (a *app) login(w http.ResponseWriter, r *http.Request) {
	var c credentials
	if err := decodeJSON(r, &c); err != nil {
		jsonError(w, 400, "Invalid request")
		return
	}
	var id int64
	var hash string
	err := a.db.QueryRow(`SELECT id,password_hash FROM users WHERE email=?`, normalizeEmail(c.Email)).Scan(&id, &hash)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(c.Password)) != nil {
		jsonError(w, 401, "Incorrect email or password")
		return
	}
	if err := a.newSession(w, r, id); err != nil {
		jsonError(w, 500, "Sign-in failed")
		return
	}
	jsonReply(w, 200, map[string]string{"email": normalizeEmail(c.Email)})
}

func (a *app) newSession(w http.ResponseWriter, r *http.Request, userID int64) error {
	token := make([]byte, 32)
	if _, err := rand.Read(token); err != nil {
		return err
	}
	value := hex.EncodeToString(token)
	hash := sha256.Sum256([]byte(value))
	expires := time.Now().Add(7 * 24 * time.Hour)
	if _, err := a.db.Exec(`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)`, hex.EncodeToString(hash[:]), userID, expires.Unix()); err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{Name: sessionCookie, Value: value, Path: "/", HttpOnly: true, Secure: r.TLS != nil, SameSite: http.SameSiteStrictMode, Expires: expires})
	return nil
}

func (a *app) currentUser(r *http.Request) (int64, string, error) {
	c, err := r.Cookie(sessionCookie)
	if err != nil {
		return 0, "", err
	}
	h := sha256.Sum256([]byte(c.Value))
	var id int64
	var email string
	err = a.db.QueryRow(`SELECT u.id,u.email FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?`, hex.EncodeToString(h[:]), time.Now().Unix()).Scan(&id, &email)
	return id, email, err
}

func (a *app) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(sessionCookie); err == nil {
		h := sha256.Sum256([]byte(c.Value))
		_, _ = a.db.Exec(`DELETE FROM sessions WHERE token_hash=?`, hex.EncodeToString(h[:]))
	}
	http.SetCookie(w, &http.Cookie{Name: sessionCookie, Path: "/", MaxAge: -1, HttpOnly: true, SameSite: http.SameSiteStrictMode})
	w.WriteHeader(http.StatusNoContent)
}

func (a *app) getProfile(w http.ResponseWriter, r *http.Request) {
	id, email, err := a.currentUser(r)
	if err != nil {
		jsonError(w, 401, "Please sign in")
		return
	}
	var raw string
	if err := a.db.QueryRow(`SELECT profile_json FROM users WHERE id=?`, id).Scan(&raw); err != nil {
		jsonError(w, 500, "Could not load profile")
		return
	}
	var p profile
	_ = json.Unmarshal([]byte(raw), &p)
	jsonReply(w, 200, map[string]any{"email": email, "profile": p})
}

func (a *app) updateProfile(w http.ResponseWriter, r *http.Request) {
	id, _, err := a.currentUser(r)
	if err != nil {
		jsonError(w, 401, "Please sign in")
		return
	}
	var p profile
	if err := decodeJSON(r, &p); err != nil {
		jsonError(w, 400, "Invalid request")
		return
	}
	fields := []string{p.FullName, p.Phone, p.Street, p.House, p.Entrance, p.Floor, p.Apartment}
	for _, field := range fields {
		if len(field) > 200 {
			jsonError(w, 400, "Field is too long")
			return
		}
	}
	b, _ := json.Marshal(p)
	if _, err := a.db.Exec(`UPDATE users SET profile_json=? WHERE id=?`, string(b), id); err != nil {
		jsonError(w, 500, "Could not save profile")
		return
	}
	jsonReply(w, 200, p)
}

func (a *app) createOrder(w http.ResponseWriter, r *http.Request) {
	id, _, err := a.currentUser(r)
	if err != nil {
		jsonError(w, 401, "Please sign in")
		return
	}
	var input struct {
		Items []struct {
			ID       int `json:"id"`
			Quantity int `json:"quantity"`
		} `json:"items"`
		CustomerInfo  profile `json:"customerInfo"`
		PaymentMethod string  `json:"paymentMethod"`
	}
	if err := decodeJSON(r, &input); err != nil {
		jsonError(w, 400, "Invalid order")
		return
	}
	if len(input.Items) == 0 || len(input.Items) > 50 || input.CustomerInfo.FullName == "" || input.CustomerInfo.Phone == "" || input.CustomerInfo.Street == "" || input.CustomerInfo.House == "" {
		jsonError(w, 400, "Add items and a delivery address")
		return
	}
	if input.PaymentMethod != "Cash on delivery" && input.PaymentMethod != "Card on delivery" {
		jsonError(w, 400, "Choose a payment method on delivery")
		return
	}
	result := order{Orders: make([]orderItem, 0, len(input.Items)), CustomerInfo: input.CustomerInfo, PaymentMethod: input.PaymentMethod, Status: "created", Timestamp: time.Now().UTC()}
	seen := make(map[int]bool)
	for _, item := range input.Items {
		p, ok := a.byID[item.ID]
		if !ok || item.Quantity < 1 || item.Quantity > 99 || seen[item.ID] {
			jsonError(w, 400, "Invalid items")
			return
		}
		seen[item.ID] = true
		result.Orders = append(result.Orders, orderItem{Item: p, Quantity: item.Quantity})
		result.TotalAmount += p.Price * item.Quantity
	}
	b, _ := json.Marshal(result)
	res, err := a.db.Exec(`INSERT INTO orders(user_id,data_json,created_at) VALUES(?,?,?)`, id, string(b), result.Timestamp.Format(time.RFC3339Nano))
	if err != nil {
		jsonError(w, 500, "Could not save order")
		return
	}
	result.ID, _ = res.LastInsertId()
	jsonReply(w, 201, result)
}

func (a *app) getOrders(w http.ResponseWriter, r *http.Request) {
	id, _, err := a.currentUser(r)
	if err != nil {
		jsonError(w, 401, "Please sign in")
		return
	}
	rows, err := a.db.Query(`SELECT id,data_json FROM orders WHERE user_id=? ORDER BY id DESC`, id)
	if err != nil {
		jsonError(w, 500, "Could not load orders")
		return
	}
	defer rows.Close()
	result := make([]order, 0)
	for rows.Next() {
		var o order
		var orderID int64
		var raw string
		if err := rows.Scan(&orderID, &raw); err != nil {
			jsonError(w, 500, "Could not load orders")
			return
		}
		if err := json.Unmarshal([]byte(raw), &o); err != nil {
			jsonError(w, 500, "Could not load orders")
			return
		}
		o.ID = orderID
		result = append(result, o)
	}
	if err := rows.Err(); err != nil {
		jsonError(w, 500, "Could not load orders")
		return
	}
	jsonReply(w, 200, result)
}

func spaHandler(buildPath string) http.Handler {
	fs := http.FileServer(http.Dir(buildPath))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}
		path := filepath.Join(buildPath, filepath.FromSlash(strings.TrimPrefix(r.URL.Path, "/")))
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			fs.ServeHTTP(w, r)
			return
		}
		if _, err := os.Stat(filepath.Join(buildPath, "index.html")); err != nil {
			http.Error(w, fmt.Sprint(err), 500)
			return
		}
		http.ServeFile(w, r, filepath.Join(buildPath, "index.html"))
	})
}
