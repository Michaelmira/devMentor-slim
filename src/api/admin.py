import os
from flask import redirect, request, session, url_for
from flask_admin import Admin, AdminIndexView, expose
from flask_admin.contrib.sqla import ModelView
from .models import (
    db, Mentor, Customer, Booking, PortfolioPhoto, 
    MentorAvailability, MentorUnavailability, CalendarSettings, MentorImage
)


class SecureModelView(ModelView):
    """Secure model view that requires admin login"""
    def is_accessible(self):
        return session.get('admin_logged_in', False)
    
    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('admin.login_view'))


class MyAdminIndexView(AdminIndexView):
    """Custom admin index view with login/logout functionality"""
    
    @expose('/')
    def index(self):
        if not session.get('admin_logged_in'):
            return redirect(url_for('.login_view'))
        return super(MyAdminIndexView, self).index()
    
    @expose('/login', methods=['GET', 'POST'])
    def login_view(self):
        if request.method == 'POST':
            username = request.form.get('username')
            password = request.form.get('password')
            
            # Check credentials against environment variables
            if (username == os.getenv("ADMIN_USERNAME", "admin") and 
                password == os.getenv("ADMIN_PASSWORD", "admin")):
                session['admin_logged_in'] = True
                return redirect(url_for('.index'))
            
            # You could add error handling here if needed
            
        return self.render('admin_login.html')
    
    @expose('/logout')
    def logout_view(self):
        session.pop('admin_logged_in', None)
        return redirect(url_for('.login_view'))


def setup_admin(app):
    """Setup Flask-Admin with secure authentication"""
    app.secret_key = os.environ.get('FLASK_APP_KEY', 'sample key')
    app.config['FLASK_ADMIN_SWATCH'] = 'cerulean'
    
    # Initialize admin with custom index view
    admin = Admin(
        app, 
        name='4Geeks Admin', 
        template_mode='bootstrap3',
        index_view=MyAdminIndexView()
    )
    
    # Add all models with secure access
    admin.add_view(SecureModelView(Mentor, db.session))
    admin.add_view(SecureModelView(Customer, db.session))
    admin.add_view(SecureModelView(Booking, db.session))
    admin.add_view(SecureModelView(PortfolioPhoto, db.session))
    admin.add_view(SecureModelView(MentorAvailability, db.session))
    admin.add_view(SecureModelView(MentorUnavailability, db.session))
    admin.add_view(SecureModelView(CalendarSettings, db.session))
    admin.add_view(SecureModelView(MentorImage, db.session))
    
    return admin