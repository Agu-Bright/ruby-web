"""
Ruby+ Full System Test: Hotel Business Registration → Customer Booking → Business Management
"""
import requests
import json
import time
import sys

BASE = 'http://127.0.0.1:3000/api'
RESULTS = []

def h(token):
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

def log(step, passed, detail=''):
    icon = 'PASS' if passed else 'FAIL'
    RESULTS.append((step, passed, detail))
    print(f'  [{icon}] {step}')
    if detail:
        print(f'         {detail}')

def safe_get(data, *keys, default=None):
    """Safely navigate nested dicts"""
    for k in keys:
        if isinstance(data, dict):
            data = data.get(k, default)
        else:
            return default
    return data

# =========================================================
print('=' * 60)
print('RUBY+ END-TO-END HOTEL BOOKING SYSTEM TEST')
print('=' * 60)

# =========================================================
# PHASE 1: SETUP — Admin seeds taxonomy, location, templates
# =========================================================
print('\n--- PHASE 1: ADMIN SETUP ---\n')

# 1.1 Admin login
r = requests.post(f'{BASE}/auth/admin/login', json={
    'email': 'admin@rubyplus.net',
    'password': 'Admin123!@#'
})
admin_data = r.json()
admin_token = safe_get(admin_data, 'data', 'accessToken')
log('1.1 Admin login', bool(admin_token))

if not admin_token:
    print('FATAL: Cannot proceed without admin token')
    sys.exit(1)

# 1.2 Create location hierarchy (Country → State → City)
# Check existing locations first
r = requests.get(f'{BASE}/locations', headers=h(admin_token))
locs = safe_get(r.json(), 'data') or []
if isinstance(locs, dict):
    locs = locs.get('items', locs.get('data', []))

nigeria = next((l for l in locs if l.get('slug') == 'nigeria'), None)
if not nigeria:
    r = requests.post(f'{BASE}/locations', headers=h(admin_token), json={
        'name': 'Nigeria', 'slug': 'nigeria', 'type': 'COUNTRY', 'isActive': True
    })
    nigeria = safe_get(r.json(), 'data')
    log('1.2a Create Nigeria (COUNTRY)', r.status_code in [200, 201], f'ID: {safe_get(nigeria, "_id")}')
else:
    log('1.2a Nigeria exists', True, f'ID: {nigeria["_id"]}')

nigeria_id = nigeria['_id'] if nigeria else None

# State
lagos_state = next((l for l in locs if l.get('slug') == 'lagos-state'), None)
if not lagos_state and nigeria_id:
    r = requests.post(f'{BASE}/locations', headers=h(admin_token), json={
        'name': 'Lagos State', 'slug': 'lagos-state', 'type': 'STATE',
        'parentId': nigeria_id, 'isActive': True
    })
    lagos_state = safe_get(r.json(), 'data')
    log('1.2b Create Lagos State', r.status_code in [200, 201], f'ID: {safe_get(lagos_state, "_id")}')
else:
    log('1.2b Lagos State exists', True, f'ID: {safe_get(lagos_state, "_id")}')

lagos_state_id = lagos_state['_id'] if lagos_state else None

# City
lagos_city = next((l for l in locs if l.get('slug') == 'lagos'), None)
if not lagos_city and lagos_state_id:
    r = requests.post(f'{BASE}/locations', headers=h(admin_token), json={
        'name': 'Lagos', 'slug': 'lagos', 'type': 'CITY',
        'parentId': lagos_state_id, 'isActive': True,
        'coordinates': {'latitude': 6.5244, 'longitude': 3.3792}
    })
    lagos_city = safe_get(r.json(), 'data')
    log('1.2c Create Lagos (CITY)', r.status_code in [200, 201], f'ID: {safe_get(lagos_city, "_id")}')
else:
    log('1.2c Lagos City exists', True, f'ID: {safe_get(lagos_city, "_id")}')

location_id = lagos_city['_id'] if lagos_city else None

# 1.3 Create Category Group
r = requests.get(f'{BASE}/admin/taxonomy/groups', headers=h(admin_token))
groups = safe_get(r.json(), 'data') or []
if isinstance(groups, dict):
    groups = groups.get('items', groups.get('data', []))

top_tiles = next((g for g in groups if g.get('slug') == 'top-tiles'), None)
if not top_tiles:
    r = requests.post(f'{BASE}/admin/taxonomy/groups', headers=h(admin_token), json={
        'name': 'Top Tiles', 'slug': 'top-tiles', 'type': 'TOP_TILES',
        'displayOrder': 1, 'isActive': True
    })
    top_tiles = safe_get(r.json(), 'data')
    log('1.3 Create category group (TOP_TILES)', r.status_code in [200, 201], f'ID: {safe_get(top_tiles, "_id")}')
else:
    log('1.3 Category group exists', True, f'ID: {top_tiles["_id"]}')

group_id = top_tiles['_id'] if top_tiles else None

# 1.4 Create Hotels & Travel category
r = requests.get(f'{BASE}/admin/taxonomy/categories', headers=h(admin_token))
cats = safe_get(r.json(), 'data') or []
if isinstance(cats, dict):
    cats = cats.get('items', cats.get('data', []))

hotels_cat = next((c for c in cats if c.get('slug') == 'hotels-travel'), None)
if not hotels_cat:
    r = requests.post(f'{BASE}/admin/taxonomy/categories', headers=h(admin_token), json={
        'name': 'Hotels & Travel',
        'slug': 'hotels-travel',
        'description': 'Stay somewhere extraordinary. Hotels, shortlets.',
        'defaultGroupType': 'TOP_TILES',
        'displayOrder': 10,
        'isActive': True,
        'isService': True,
    })
    resp = r.json()
    hotels_cat = safe_get(resp, 'data')
    log('1.4 Create Hotels & Travel category', r.status_code in [200, 201],
        f'ID: {safe_get(hotels_cat, "_id")}' if hotels_cat else f'Error: {json.dumps(resp)[:200]}')
else:
    log('1.4 Hotels & Travel category exists', True, f'ID: {hotels_cat["_id"]}')

category_id = hotels_cat['_id'] if hotels_cat else None

# 1.5 Create Hotels subcategory with BOOKING_VISIT model
if category_id:
    r = requests.get(f'{BASE}/admin/taxonomy/categories/{category_id}/subcategories', headers=h(admin_token))
    subs = safe_get(r.json(), 'data') or []
    if isinstance(subs, dict):
        subs = subs.get('items', subs.get('data', []))

    hotel_sub = next((s for s in subs if s.get('slug') == 'hotels'), None)
    if not hotel_sub:
        r = requests.post(f'{BASE}/admin/taxonomy/subcategories', headers=h(admin_token), json={
            'name': 'Hotels',
            'slug': 'hotels',
            'categoryId': category_id,
            'businessModel': 'BOOKING_VISIT',
            'riskTier': 'LOW',
            'allowedFulfillmentModes': ['ON_SITE'],
            'displayOrder': 1,
            'isActive': True,
        })
        resp = r.json()
        hotel_sub = safe_get(resp, 'data')
        log('1.5 Create Hotels subcategory (BOOKING_VISIT)', r.status_code in [200, 201],
            f'ID: {safe_get(hotel_sub, "_id")}, Model: {safe_get(hotel_sub, "businessModel")}' if hotel_sub else f'Error: {json.dumps(resp)[:200]}')
    else:
        log('1.5 Hotels subcategory exists', True,
            f'ID: {hotel_sub["_id"]}, Model: {hotel_sub.get("businessModel")}')

    subcategory_id = hotel_sub['_id'] if hotel_sub else None
else:
    log('1.5 Hotels subcategory', False, 'No category ID')
    subcategory_id = None

# =========================================================
# PHASE 2: BUSINESS REGISTRATION
# =========================================================
print('\n--- PHASE 2: HOTEL BUSINESS REGISTRATION ---\n')

# 2.1 Register business owner account (only email + password for business registration)
biz_email = f'hotel_owner_{int(time.time())}@test.com'
biz_password = 'Hotel123!@#'
r = requests.post(f'{BASE}/auth/business/register', json={
    'email': biz_email,
    'password': biz_password,
    'phone': f'+2348{int(time.time()) % 100000000:08d}',
})
biz_auth = r.json()
biz_token = safe_get(biz_auth, 'data', 'accessToken')
biz_user_id = safe_get(biz_auth, 'data', 'user', '_id') or safe_get(biz_auth, 'data', 'userId')
log('2.1 Register business owner', r.status_code in [200, 201],
    f'Token: {"yes" if biz_token else "no"}, User: {biz_user_id}')

if not biz_token:
    # Try login in case registration returned without token
    r = requests.post(f'{BASE}/auth/business/login', json={
        'email': biz_email, 'password': biz_password
    })
    biz_login = r.json()
    biz_token = safe_get(biz_login, 'data', 'accessToken')
    log('2.1b Business login fallback', bool(biz_token),
        f'Token: {biz_token[:20]}...' if biz_token else f'Error: {json.dumps(biz_login)[:200]}')

# 2.2 Create hotel business (if we have token)
business_id = None
if biz_token and location_id and category_id and subcategory_id:
    biz_ts = int(time.time())
    r = requests.post(f'{BASE}/business', headers=h(biz_token), json={
        'name': f'Test Luxury Hotel {biz_ts}',
        'description': 'A beautiful test hotel in the heart of Lagos',
        'categoryId': category_id,
        'subcategoryId': subcategory_id,
        'locationId': location_id,
        'latitude': 6.4541,
        'longitude': 3.4218,
        'acceptsBookings': True,
        'address': {
            'street': '25 Admiralty Way',
            'city': 'Lagos',
            'state': 'Lagos',
            'landmark': 'Near Lekki Phase 1'
        },
        'contact': {
            'phone': '+2348012345678',
            'email': 'info@testluxuryhotel.com',
        },
        'hours': [
            {'dayOfWeek': d, 'openTime': '00:00', 'closeTime': '23:59', 'isClosed': False}
            for d in range(7)
        ],
    })
    resp = r.json()
    business = safe_get(resp, 'data')
    business_id = safe_get(business, '_id')
    log('2.2 Create hotel business', r.status_code in [200, 201] and bool(business_id),
        f'ID: {business_id}, Status: {safe_get(business, "status")}' if business_id else f'Error: {json.dumps(resp)[:300]}')

# 2.3 Submit for review
if business_id and biz_token:
    r = requests.post(f'{BASE}/business/{business_id}/submit-for-review', headers=h(biz_token))
    resp = r.json()
    log('2.3 Submit for review', resp.get('success', False),
        f'Status: {safe_get(resp, "data", "status")}')

# 2.4 Admin approves
if business_id and admin_token:
    r = requests.post(f'{BASE}/admin/businesses/{business_id}/approve', headers=h(admin_token))
    resp = r.json()
    log('2.4 Admin approves business', resp.get('success', False),
        f'Status: {safe_get(resp, "data", "status")}')

# 2.5 Business goes live
if business_id and biz_token:
    r = requests.post(f'{BASE}/business/{business_id}/go-live', headers=h(biz_token))
    resp = r.json()
    log('2.5 Business goes LIVE', resp.get('success', False),
        f'Status: {safe_get(resp, "data", "status")}' if resp.get('success') else f'Error: {json.dumps(resp)[:200]}')

# 2.6 Create service listing (Deluxe Room)
service_id = None
if business_id and biz_token:
    r = requests.post(f'{BASE}/business/services', headers=h(biz_token), json={
        'businessId': business_id,
        'locationId': location_id,
        'categoryId': category_id,
        'subcategoryId': subcategory_id,
        'name': 'Deluxe Room',
        'description': 'Luxury room with king bed, AC, WiFi, and ensuite bathroom',
        'category': 'Rooms',
        'pricing': {
            'type': 'FIXED',
            'basePrice': 50000,
            'currency': 'NGN',
            'depositPercent': 50,
        },
        'duration': {
            'minutes': 1440,
            'isFlexible': True,
            'minMinutes': 480,
            'maxMinutes': 1440,
        },
        'fulfillmentMode': 'ON_SITE',
        'availability': [
            {'dayOfWeek': d, 'isAvailable': True, 'slots': [
                '08:00', '12:00', '16:00', '20:00'
            ], 'capacityPerSlot': 5}
            for d in range(7)
        ],
        'cancellationPolicy': {
            'freeCancellationHours': 24,
            'cancellationFeePercent': 50,
        },
        'requirements': ['Valid ID or passport'],
        'includes': ['Breakfast', 'WiFi', 'Parking'],
    })
    resp = r.json()
    service = safe_get(resp, 'data')
    service_id = safe_get(service, '_id')
    log('2.6 Create Deluxe Room service', r.status_code in [200, 201] and bool(service_id),
        f'ID: {service_id}, Price: {safe_get(service, "pricing", "basePrice")}, Status: {safe_get(service, "status")}' if service_id else f'Error: {json.dumps(resp)[:300]}')

# 2.7 Activate the service (it starts as DRAFT)
if service_id and biz_token:
    r = requests.post(f'{BASE}/business/services/{service_id}/activate', headers=h(biz_token))
    resp = r.json()
    log('2.7 Activate service', resp.get('success', False),
        f'Status: {safe_get(resp, "data", "status")}' if resp.get('success') else f'Error: {json.dumps(resp)[:200]}')

# 2.8 Re-login as business owner to get token WITH businessId in JWT
# The registration token doesn't include businessId (business didn't exist yet).
# After creating the business, we must login again so the JWT includes businessId.
if biz_email:
    r = requests.post(f'{BASE}/auth/business/login', json={
        'email': biz_email, 'password': biz_password
    })
    login_resp = r.json()
    new_token = safe_get(login_resp, 'data', 'accessToken')
    if new_token:
        biz_token = new_token
    log('2.8 Re-login (get businessId in JWT)', bool(new_token),
        f'Token refreshed' if new_token else f'Error: {json.dumps(login_resp)[:200]}')

# =========================================================
# PHASE 3: CUSTOMER BOOKS A RESERVATION
# =========================================================
print('\n--- PHASE 3: CUSTOMER BOOKING ---\n')

# 3.1 Register customer
cust_email = f'customer_{int(time.time())}@test.com'
r = requests.post(f'{BASE}/auth/user/register', json={
    'firstName': 'Jane',
    'lastName': 'Traveler',
    'email': cust_email,
    'phone': f'+2349{int(time.time()) % 100000000:08d}',
    'password': 'Customer123!@#'
})
cust_auth = r.json()
cust_token = safe_get(cust_auth, 'data', 'accessToken')
cust_user_id = safe_get(cust_auth, 'data', 'user', '_id') or safe_get(cust_auth, 'data', 'userId')
log('3.1 Register customer', bool(cust_token),
    f'Token obtained, User: {cust_user_id}' if cust_token else f'Response: {json.dumps(cust_auth)[:300]}')

if not cust_token:
    # Try login
    r = requests.post(f'{BASE}/auth/user/login', json={'email': cust_email, 'password': 'Customer123!@#'})
    cust_login = r.json()
    cust_token = safe_get(cust_login, 'data', 'accessToken')
    log('3.1b Customer login', bool(cust_token), f'{json.dumps(cust_login)[:200]}')

# 3.2 Discover hotel (public)
if business_id:
    r = requests.get(f'{BASE}/public/businesses/{business_id}')
    resp = r.json()
    biz = safe_get(resp, 'data')
    log('3.2 Discover hotel (public)', resp.get('success', False),
        f'Name: {safe_get(biz, "name")}, Status: {safe_get(biz, "status")}')

# 3.3 View services (public)
if business_id:
    r = requests.get(f'{BASE}/public/services/business/{business_id}')
    resp = r.json()
    services = safe_get(resp, 'data') or []
    if isinstance(services, dict):
        services = services.get('items', services.get('data', []))
    log('3.3 View hotel services', len(services) > 0 if isinstance(services, list) else False,
        f'Found {len(services) if isinstance(services, list) else 0} services')

# 3.4 Create booking
booking_id = None
if cust_token and service_id:
    tomorrow = time.strftime('%Y-%m-%d', time.localtime(time.time() + 86400))
    r = requests.post(f'{BASE}/user/bookings', headers=h(cust_token), json={
        'serviceId': service_id,
        'bookingDate': tomorrow,
        'startTime': '14:00',
        'fulfillmentMode': 'ON_SITE',
        'customerNotes': 'Late check-in, arriving at 2 PM. Need a quiet room please.',
    })
    resp = r.json()
    booking = safe_get(resp, 'data')
    booking_id = safe_get(booking, '_id')
    booking_ref = safe_get(booking, 'bookingRef')
    log('3.4 Create booking (reservation)', r.status_code in [200, 201] and bool(booking_id),
        f'ID: {booking_id}, Ref: {booking_ref}, Status: {safe_get(booking, "status")}, Total: {safe_get(booking, "feeBreakdown", "total") or safe_get(booking, "fees", "total")}'
        if booking_id else f'Error: {json.dumps(resp)[:400]}')

# 3.5 Customer views their bookings
if cust_token:
    r = requests.get(f'{BASE}/user/bookings', headers=h(cust_token))
    resp = r.json()
    bookings = safe_get(resp, 'data') or []
    if isinstance(bookings, dict):
        bookings = bookings.get('items', bookings.get('data', []))
    log('3.5 Customer views bookings list', len(bookings) > 0 if isinstance(bookings, list) else False,
        f'Found {len(bookings) if isinstance(bookings, list) else 0} bookings')

# 3.6 Customer views booking detail
if cust_token and booking_id:
    r = requests.get(f'{BASE}/user/bookings/{booking_id}', headers=h(cust_token))
    resp = r.json()
    detail = safe_get(resp, 'data')
    ok = resp.get('success', False)
    log('3.6 Customer views booking detail', ok,
        f'Status: {safe_get(detail, "status")}, Service: {safe_get(detail, "serviceSnapshot", "name") or safe_get(detail, "serviceId")}'
        if ok else f'HTTP {r.status_code}, Response: {json.dumps(resp)[:400]}')

# =========================================================
# PHASE 4: BUSINESS MANAGES THE BOOKING
# =========================================================
print('\n--- PHASE 4: BUSINESS MANAGES BOOKING ---\n')

# 4.1 Business views their bookings
if biz_token:
    r = requests.get(f'{BASE}/business/bookings', headers=h(biz_token))
    resp = r.json()
    biz_bookings = safe_get(resp, 'data') or []
    if isinstance(biz_bookings, dict):
        biz_bookings = biz_bookings.get('items', biz_bookings.get('data', []))
    log('4.1 Business views bookings', len(biz_bookings) > 0 if isinstance(biz_bookings, list) else False,
        f'Found {len(biz_bookings) if isinstance(biz_bookings, list) else 0} bookings')

# 4.2 Business views booking detail
if biz_token and booking_id:
    r = requests.get(f'{BASE}/business/bookings/{booking_id}', headers=h(biz_token))
    resp = r.json()
    detail = safe_get(resp, 'data')
    ok = resp.get('success', False)
    log('4.2 Business views booking detail', ok,
        f'Customer notes: {safe_get(detail, "customerNotes")}, Status: {safe_get(detail, "status")}'
        if ok else f'HTTP {r.status_code}, Response: {json.dumps(resp)[:400]}')

# 4.3 Business confirms booking
if biz_token and booking_id:
    r = requests.post(f'{BASE}/business/bookings/{booking_id}/confirm', headers=h(biz_token), json={
        'businessNotes': 'Confirmed! Quiet room assigned. Check-in at front desk.'
    })
    resp = r.json()
    log('4.3 Business confirms booking', resp.get('success', False),
        f'Status: {safe_get(resp, "data", "status")}' if resp.get('success') else f'Error: {json.dumps(resp)[:200]}')

# 4.4 Business marks IN_PROGRESS (guest checks in)
if biz_token and booking_id:
    r = requests.put(f'{BASE}/business/bookings/{booking_id}/status', headers=h(biz_token), json={
        'status': 'IN_PROGRESS',
        'note': 'Guest has arrived and checked in'
    })
    resp = r.json()
    log('4.4 Mark IN_PROGRESS (check-in)', resp.get('success', False),
        f'Status: {safe_get(resp, "data", "status")}' if resp.get('success') else f'Error: {json.dumps(resp)[:200]}')

# 4.5 Business records safety check-in
if biz_token and booking_id:
    r = requests.post(f'{BASE}/business/bookings/{booking_id}/safety-checkin', headers=h(biz_token), json={
        'eventType': 'CHECK_IN',
        'note': 'Guest verified with passport',
    })
    resp = r.json()
    log('4.5 Safety check-in recorded', resp.get('success', False),
        f'{json.dumps(resp)[:200]}')

# 4.6 Business completes booking (guest checks out)
if biz_token and booking_id:
    r = requests.put(f'{BASE}/business/bookings/{booking_id}/status', headers=h(biz_token), json={
        'status': 'COMPLETED',
        'note': 'Guest checked out successfully'
    })
    resp = r.json()
    log('4.6 Mark COMPLETED (check-out)', resp.get('success', False),
        f'Status: {safe_get(resp, "data", "status")}' if resp.get('success') else f'Error: {json.dumps(resp)[:200]}')

# 4.7 Business booking stats (need businessId query param)
if biz_token and business_id:
    r = requests.get(f'{BASE}/business/bookings/stats?businessId={business_id}', headers=h(biz_token))
    resp = r.json()
    log('4.7 Business booking stats', resp.get('success', False),
        f'Stats: {json.dumps(safe_get(resp, "data"))[:200]}' if resp.get('success') else f'Error: {json.dumps(resp)[:200]}')

# =========================================================
# PHASE 5: ADDITIONAL FLOWS
# =========================================================
print('\n--- PHASE 5: ADDITIONAL FLOWS ---\n')

# 5.1 Test cancellation flow (create a second booking, then cancel)
booking2_id = None
if cust_token and service_id:
    day_after = time.strftime('%Y-%m-%d', time.localtime(time.time() + 172800))
    r = requests.post(f'{BASE}/user/bookings', headers=h(cust_token), json={
        'serviceId': service_id,
        'bookingDate': day_after,
        'startTime': '10:00',
        'fulfillmentMode': 'ON_SITE',
        'customerNotes': 'Test booking for cancellation flow',
    })
    resp = r.json()
    booking2_id = safe_get(resp, 'data', '_id')
    log('5.1 Create 2nd booking (for cancel test)', r.status_code in [200, 201],
        f'ID: {booking2_id}')

if cust_token and booking2_id:
    r = requests.post(f'{BASE}/user/bookings/{booking2_id}/cancel', headers=h(cust_token), json={
        'reason': 'Change of plans, no longer traveling'
    })
    resp = r.json()
    log('5.2 Customer cancels booking', resp.get('success', False),
        f'Status: {safe_get(resp, "data", "status")}' if resp.get('success') else f'Error: {json.dumps(resp)[:200]}')

# 5.3 Test reschedule flow (create 3rd booking, then reschedule)
booking3_id = None
if cust_token and service_id:
    day3 = time.strftime('%Y-%m-%d', time.localtime(time.time() + 259200))
    r = requests.post(f'{BASE}/user/bookings', headers=h(cust_token), json={
        'serviceId': service_id,
        'bookingDate': day3,
        'startTime': '16:00',
        'fulfillmentMode': 'ON_SITE',
    })
    resp = r.json()
    booking3_id = safe_get(resp, 'data', '_id')
    log('5.3 Create 3rd booking (for reschedule)', r.status_code in [200, 201],
        f'ID: {booking3_id}')

if cust_token and booking3_id:
    new_date = time.strftime('%Y-%m-%d', time.localtime(time.time() + 345600))
    r = requests.post(f'{BASE}/user/bookings/{booking3_id}/reschedule', headers=h(cust_token), json={
        'newDate': new_date,
        'newStartTime': '12:00',
        'reason': 'Flight delayed, need later check-in'
    })
    resp = r.json()
    log('5.4 Customer reschedules booking', resp.get('success', False),
        f'New date: {new_date}' if resp.get('success') else f'Error: {json.dumps(resp)[:200]}')

# 5.5 Admin views all bookings
if admin_token:
    r = requests.get(f'{BASE}/admin/bookings', headers=h(admin_token))
    resp = r.json()
    admin_bookings = safe_get(resp, 'data') or []
    if isinstance(admin_bookings, dict):
        admin_bookings = admin_bookings.get('items', admin_bookings.get('data', []))
    log('5.5 Admin views all bookings', len(admin_bookings) > 0 if isinstance(admin_bookings, list) else False,
        f'Total bookings in system: {len(admin_bookings) if isinstance(admin_bookings, list) else 0}')

# 5.6 Public booking lookup by reference
booking_ref = globals().get('booking_ref')
if booking_ref:
    r = requests.get(f'{BASE}/bookings/ref/{booking_ref}')
    resp = r.json()
    ok = resp.get('success', False)
    log('5.6 Public lookup by booking ref', ok,
        f'Found booking: {safe_get(resp, "data", "bookingRef")}'
        if ok else f'HTTP {r.status_code}, Response: {json.dumps(resp)[:400]}')

# =========================================================
# FINAL REPORT
# =========================================================
print('\n' + '=' * 60)
print('TEST RESULTS SUMMARY')
print('=' * 60)

passed = sum(1 for _, p, _ in RESULTS if p)
failed = sum(1 for _, p, _ in RESULTS if not p)
total = len(RESULTS)

print(f'\nTotal: {total} | Passed: {passed} | Failed: {failed}')
print(f'Pass Rate: {passed/total*100:.0f}%\n')

if failed > 0:
    print('FAILED TESTS:')
    for step, p, detail in RESULTS:
        if not p:
            print(f'  - {step}: {detail}')

print()
