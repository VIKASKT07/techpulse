from flask import Flask, request, jsonify, render_template, redirect, url_for,flash
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask import session
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


import time  # Import time for sleep function

app = Flask(__name__)
CORS(app)

# Configure SQLite Database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = "your_secret_key"

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False, unique=True)
    email = db.Column(db.String(120), nullable=False, unique=True)
    password = db.Column(db.String(128), nullable=False)

# Initialize the database
with app.app_context():
    db.create_all()

@app.before_request
def before_request():
    if request.endpoint == 'splash':  # Check if it's the splash route
        time.sleep(3)  # Sleep for 3 seconds

@app.route('/')
def splash():
    # Render the splash page when the user accesses the root URL
    return render_template('splash.html')

@app.route('/login')
def login():
    # After the splash page, redirect to the login page
    return render_template('login.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')
    
# Route for the main page (index.html)
@app.route('/main')
def main_page():
    # Retrieve the username from the session
    username = session.get('username')

    # If no username is found in session, redirect to login (to handle unauthorized access)
    if not username:
        return redirect(url_for('login'))

    return render_template('index.html', username=username)  # Pass username to the template
  # Ensure `index.html` is in your `templates` folder.

@app.route('/home')
def home():
    return render_template('index.html')  # or any other template you want to render

@app.route('/index')
def index():
    return render_template('index.html')


@app.route('/get-username')
def get_username():
    # Check if the username is stored in session
    username = session.get('username')

    if username:
        return jsonify({'username': username})
    else:
        return jsonify({'username': None})  # Return None if not logged in

@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    # Perform server-side validations and user creation
    if not username or not email or not password:
        return jsonify({"error": "All fields are required!"}), 400

    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists!'}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(username=username, email=email, password=hashed_password)

    db.session.add(new_user)
    db.session.commit()

    # Save the username in the session
    session['username'] = username

    return jsonify({'message': 'User registered successfully!', 'redirect_url': url_for('main_page')}), 201


# Email configuration
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "techpulse318@gmail.com"
SENDER_PASSWORD = "jpkibmjjjwgakxdd"

def send_email(name, from_email, message):
    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = SENDER_EMAIL
    msg['Subject'] = f"Feedback from {name}"

    body = f"""
    Name: {name}
    Email: {from_email}
    Message: {message}
    """
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

# Route for showing the feedback form
@app.route('/feedback', methods=['GET', 'POST'])
def feedback():
    if request.method == 'POST':
        # Get data from the form
        name = request.form.get('name')
        from_email = request.form.get('email')
        message = request.form.get('message')

        # Assuming send_email is a function you have defined to send feedback
        if send_email(name, from_email, message):
            flash('Thank you for your feedback!', 'success')
            return redirect('/thankyou')  # Redirect to a thank you page after successful submission
        else:
            flash('Error sending feedback. Please try again.', 'error')

    # Render the feedback form on GET request
    return render_template('feedback.html')

# Route for the thank you page
@app.route('/thankyou')
def thank_you():
    return render_template('thankyou.html')  # This is a simple thank you page

# Assuming you have a function that handles sending emails
def send_email(name, from_email, message):
    # Simulate sending email (you would have your actual implementation here)
    print(f"Sending email to admin from {name} ({from_email}) with message: {message}")
    return True  # Simulate a successful email send



@app.route('/login', methods=['POST'])
def login_post():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not (email and password):
        return jsonify({'error': 'Both fields are required!'}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not bcrypt.check_password_hash(user.password, password):
        return jsonify({'error': 'Invalid credentials!'}), 401

    # Save the user's username in the session
    session['username'] = user.username

    # Redirect to the main page upon successful login
    return jsonify({'message': 'Login successful!', 'redirect_url': url_for('main_page')}), 200

@app.route('/logout')
def logout():
    session.pop('username', None)  # Remove the username from the session
    return redirect('splash.html')  # Redirect to the login page



@app.route('/guest-login')
def guest_login():
    # Clear the username from the session if it exists
    session.pop('username', None)
    return render_template('index.html')  # Render the index.html template

  # Redirect to the main page directly for guest login

NAV_ITEMS = [
    {"name": "Home", "url": "home", "icon": "fas fa-home"},
    {"name": "Categories", "url": "categories", "icon": "fas fa-list"},
    {"name": "Contact", "url": "contact", "icon": "fas fa-envelope"},
    {"name": "Logout", "url": "logout", "icon": "fas fa-sign-out-alt"},
    {"name": "AI Assistance", "url": "ai_assistance", "icon": "fas fa-robot"},
]

if __name__ == '__main__':
    app.run(debug=True)
