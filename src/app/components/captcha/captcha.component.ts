import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface CaptchaChallenge {
  question: string;
  answer: number;
}

@Component({
  selector: 'app-captcha',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './captcha.component.html',
  styleUrl: './captcha.component.scss'
})
export class CaptchaComponent implements OnInit {
  @Input() errorMessage: string = '';
  @Output() validationChange = new EventEmitter<boolean>();
  @Output() captchaToken = new EventEmitter<string>();

  challenge: CaptchaChallenge | null = null;
  userAnswer: string = '';
  isValid: boolean = false;
  hasAttempted: boolean = false;
  
  // Honeypot : champ invisible pour piéger les bots
  honeypotValue: string = '';

  // Anti-bot : délai minimum avant soumission (en ms)
  private readonly MIN_SUBMISSION_DELAY = 3000; // 3 secondes
  private loadTimestamp: number = 0;

  ngOnInit(): void {
    this.loadTimestamp = Date.now();
    this.generateChallenge();
  }

  /**
   * Génère une nouvelle question mathématique
   */
  generateChallenge(): void {
    const operations = ['+', '-', '×'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let num1: number, num2: number, answer: number;
    
    switch (operation) {
      case '+':
        num1 = Math.floor(Math.random() * 10) + 1; // 1-10
        num2 = Math.floor(Math.random() * 10) + 1; // 1-10
        answer = num1 + num2;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 10) + 5; // 5-14
        num2 = Math.floor(Math.random() * num1); // 0 to num1-1 (pour éviter les négatifs)
        answer = num1 - num2;
        break;
      case '×':
        num1 = Math.floor(Math.random() * 5) + 1; // 1-5
        num2 = Math.floor(Math.random() * 5) + 1; // 1-5
        answer = num1 * num2;
        break;
      default:
        num1 = 2;
        num2 = 2;
        answer = 4;
    }
    
    this.challenge = {
      question: `${num1} ${operation} ${num2} = ?`,
      answer: answer
    };
    
    // Réinitialiser l'état
    this.userAnswer = '';
    this.isValid = false;
    this.hasAttempted = false;
    this.validationChange.emit(false);
  }

  /**
   * Vérifie la réponse de l'utilisateur
   */
  checkAnswer(): void {
    this.hasAttempted = true;
    
    // Vérifier le honeypot (si rempli, c'est un bot)
    if (this.honeypotValue) {
      console.warn('[Captcha] Honeypot triggered - probable bot');
      this.isValid = false;
      this.validationChange.emit(false);
      return;
    }
    
    // Vérifier le délai minimum (soumission trop rapide = bot)
    const elapsedTime = Date.now() - this.loadTimestamp;
    if (elapsedTime < this.MIN_SUBMISSION_DELAY) {
      console.warn(`[Captcha] Soumission trop rapide (${elapsedTime}ms < ${this.MIN_SUBMISSION_DELAY}ms) - probable bot`);
      this.isValid = false;
      this.validationChange.emit(false);
      return;
    }
    
    const userNum = parseInt(this.userAnswer, 10);
    
    if (isNaN(userNum)) {
      this.isValid = false;
      this.validationChange.emit(false);
      return;
    }
    
    this.isValid = userNum === this.challenge?.answer;
    this.validationChange.emit(this.isValid);
    
    if (this.isValid) {
      // Générer un token simple pour le backend
      const token = this.generateToken();
      this.captchaToken.emit(token);
    }
  }

  /**
   * Génère un token de validation pour le backend
   */
  private generateToken(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    // Token simple : timestamp + random (le backend peut vérifier que le timestamp est récent)
    return btoa(`${timestamp}:${random}:${this.challenge?.answer}`);
  }

  /**
   * Rafraîchit le captcha avec une nouvelle question
   */
  refresh(): void {
    this.loadTimestamp = Date.now(); // Réinitialiser le timer anti-bot
    this.generateChallenge();
  }

  /**
   * Appelé à chaque changement de la réponse
   */
  onAnswerChange(): void {
    if (this.hasAttempted) {
      this.checkAnswer();
    }
  }
}






