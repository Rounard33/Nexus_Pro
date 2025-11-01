import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router, RouterModule} from '@angular/router';
import {AuthService} from '../../services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss'
})
export class AdminLoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Si déjà connecté, rediriger vers admin
    this.authService.isAuthenticated().then(isAuth => {
      if (isAuth) {
        this.router.navigate(['/admin']);
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const {email, password} = this.loginForm.value;

    this.authService.login(email.trim(), password).then(result => {
      this.isLoading = false;
      
      if (result.success) {
        this.router.navigate(['/admin']);
      } else {
        this.errorMessage = result.error || 'Erreur lors de la connexion';
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  get emailError(): string {
    const control = this.loginForm.get('email');
    if (control?.hasError('required') && control?.touched) {
      return 'L\'email est obligatoire.';
    }
    if (control?.hasError('email') && control?.touched) {
      return 'Le format de l\'email est invalide.';
    }
    return '';
  }

  get passwordError(): string {
    const control = this.loginForm.get('password');
    if (control?.hasError('required') && control?.touched) {
      return 'Le mot de passe est obligatoire.';
    }
    if (control?.hasError('minlength') && control?.touched) {
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    }
    return '';
  }
}

