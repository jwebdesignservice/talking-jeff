/**
 * Interactive Q&A Investigation Wall
 * Cork Board with animated string connections
 */

class QAWallController {
    constructor() {
        // Q&A Data
        this.questions = {
            1: {
                question: "How many victims were involved in the Epstein case?",
                answer: "Prosecutors say dozens to potentially hundreds of underage girls were abused over many years, with some victims as young as 14. The exact number is unknown because many cases were never reported."
            },
            2: {
                question: "How did Epstein traffic and control victims?",
                answer: "Victims were paid cash, often hundreds of dollars per encounter, and some were encouraged to recruit other girls, creating a trafficking network."
            },
            3: {
                question: "How much money was Epstein worth?",
                answer: "Epstein was estimated to be worth hundreds of millions of dollars, though the full source of his wealth remains unclear."
            },
            4: {
                question: "Were other people charged in the case?",
                answer: "Only Jeffrey Epstein and Ghislaine Maxwell were criminally charged. Maxwell was convicted in 2021 for helping recruit and traffic minors."
            },
            5: {
                question: "Why do so many famous names appear in Epstein files?",
                answer: "Epstein had extensive social and business contacts. Being named in documents does not mean criminal involvement, only that contact or communication existed."
            },
            6: {
                question: "Did Epstein traffic girls to powerful individuals?",
                answer: "Investigators have said they did not find sufficient evidence to charge others with trafficking, despite Epstein's wide social circle."
            },
            7: {
                question: "What are the 'Epstein Files'?",
                answer: "They are millions of pages of documents released by courts and the DOJ, including emails, flight logs, and records tied to Epstein's activities."
            }
        };

        // DOM Elements
        this.modal = document.getElementById('qaModal');
        this.closeBtn = document.getElementById('qaCloseBtn');
        this.modalQuestion = document.getElementById('modalQuestion');
        this.modalAnswer = document.getElementById('modalAnswer');
        this.cards = document.querySelectorAll('.qa-card');

        this.init();
    }

    init() {
        if (!this.modal) return;

        // Setup card click events
        this.cards.forEach(card => {
            card.addEventListener('click', (e) => this.openQuestion(e));
        });

        // Setup close button
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.closeModal());
        }

        // Close on overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });

        // Add hover tilt effect to cards
        this.cards.forEach(card => {
            card.addEventListener('mouseenter', (e) => this.addTiltEffect(e));
            card.addEventListener('mouseleave', (e) => this.removeTiltEffect(e));
        });
    }

    openQuestion(e) {
        const card = e.currentTarget;
        const questionId = card.dataset.question;
        const data = this.questions[questionId];

        if (!data) return;

        // Populate modal content
        const questionText = this.modalQuestion.querySelector('.modal-question-text');
        const answerText = this.modalAnswer.querySelector('.answer-text');

        if (questionText) questionText.textContent = data.question;
        if (answerText) answerText.textContent = data.answer;

        // Show modal with animation
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Animate string connection
        this.animateString();
    }

    closeModal() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    animateString() {
        const string = document.getElementById('animatedString');
        if (string) {
            // Create curved path from question to answer
            string.setAttribute('d', 'M 450 120 Q 300 200, 450 320');
        }
    }

    addTiltEffect(e) {
        const card = e.currentTarget;
        const currentTransform = card.style.transform || '';
        const rotation = currentTransform.match(/rotate\(([^)]+)\)/);
        
        // Add slight tilt animation
        card.style.transition = 'transform 0.2s ease';
    }

    removeTiltEffect(e) {
        const card = e.currentTarget;
        card.style.transition = 'transform 0.3s ease';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QAWallController();
});
