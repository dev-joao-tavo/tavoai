import datetime

# Get the current hour
current_hour = datetime.datetime.now().hour

# Determine the appropriate greeting
if current_hour < 12:
    greeting = "Bom dia"
elif 12 <= current_hour < 18:
    greeting = "Boa tarde"
else:
    greeting = "Boa noite"

message1=[
    f"Olá [nome]! {'Bom dia' if datetime.datetime.now().hour < 12 else 'Boa tarde' if datetime.datetime.now().hour < 18 else 'Boa noite'}!",
    "Tudo bem? Aqui é o João novamente. :)",
    "Queria te contar um pouco mais sobre o nosso processo de higienização.",
    "A verdade é que ele vai muito além de uma limpeza superficial do tecido. Nossos produtos removem manchas, eliminam odores e combatem ácaros, fungos e bactérias que afetam a sua saúde e a da sua família.",
    "Gostaria de saber qual seria o melhor dia desta semana para agendarmos o serviço. Ainda temos alguns horários disponíveis e algumas ofertas especiais!"
]

message2 = [
    f"Olá [nome]! {'Bom dia' if datetime.datetime.now().hour < 12 else 'Boa tarde' if datetime.datetime.now().hour < 18 else 'Boa noite'}!",
    "[nome], notei que você não respondeu à minha última mensagem.", 
    "Mas como você havia mostrado interesse em higienizar o seu estofado, decidi enviar mais uma mensagem para ver como podemos te ajudar. :)",
    "Vamos agendar a higienização dos seus estofados?"
]


message3 = [
    f"Olá [nome]! {'Bom dia' if datetime.datetime.now().hour < 12 else 'Boa tarde' if datetime.datetime.now().hour < 18 else 'Boa noite'}, tudo bem? :)",
    "Você clicou no nosso anúncio há alguns dias, então queria te enviar um cupom especial de desconto valido por 7 dias: SOFÁ10%.",
    "O que acha de aproveitar o desconto e agendar a higienização dos seus estofados ainda esta semana?"
]

#message3 = [
#    f"Olá [nome]! {'Bom dia' if datetime.datetime.now().hour < 12 else 'Boa tarde' if datetime.datetime.now().hour < 18 else 'Boa noite'}!",
#    "Aqui é o João da Sofá novo de novo, tudo bem? :)",
#    "Janeiro passou, Fevereiro chegou e imagino que você vá querer aproveitar o momento para ver seus estofados higienizados e limpinhos novamente.",
#    "[nome], nós temos ainda horários no sábado e na semana que vem de manhã e de tarde. Quando seria melhor para você?"
#]

pipelineStageMessage = [f"""Olá [nome]! {'Bom dia' if datetime.datetime.now().hour < 12 else 'Boa tarde' if datetime.datetime.now().hour < 18 else 'Boa noite'}! 
    
Dê uma nova vida ao seu sofá, cadeiras e colchão com nossa higienização profissional de estofados – elimine ácaros, manchas e odores indesejados.
    
Nossa higienização remove até a sujeira mais profunda, garantindo um ambiente mais saudável para você e sua família."""
]

