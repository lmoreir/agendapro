/**
 * Validações para formulários do AgendaPro
 */

export const WHATSAPP_REGEX = /^(\d{2})\s?(\d{4,5})\-?(\d{4})$/
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface ValidationResult {
  isValid: boolean
  message?: string
}

export function validateEmail(email: string): ValidationResult {
  if (!email.trim()) {
    return { isValid: true } // Email é opcional
  }

  if (!EMAIL_REGEX.test(email)) {
    return {
      isValid: false,
      message: 'Email inválido. Use o formato: nome@dominio.com',
    }
  }

  return { isValid: true }
}

export function validateWhatsApp(whatsapp: string): ValidationResult {
  if (!whatsapp.trim()) {
    return { isValid: false, message: 'WhatsApp é obrigatório' }
  }

  // Remove caracteres especiais para validar
  const clean = whatsapp.replace(/\D/g, '')

  if (clean.length < 10 || clean.length > 11) {
    return {
      isValid: false,
      message: 'WhatsApp inválido. Use o formato: 11 99999-9999',
    }
  }

  return { isValid: true }
}

export function validateNome(nome: string): ValidationResult {
  if (!nome.trim()) {
    return { isValid: false, message: 'Nome é obrigatório' }
  }

  if (nome.trim().length < 3) {
    return { isValid: false, message: 'Nome deve ter pelo menos 3 caracteres' }
  }

  return { isValid: true }
}

export function validateSigla(sigla: string): ValidationResult {
  if (!sigla.trim()) {
    return { isValid: false, message: 'Sigla é obrigatória' }
  }

  if (sigla.trim().length < 2 || sigla.trim().length > 10) {
    return {
      isValid: false,
      message: 'Sigla deve ter entre 2 e 10 caracteres',
    }
  }

  return { isValid: true }
}

export function validateData(data: string): ValidationResult {
  if (!data.trim()) {
    return { isValid: false, message: 'Data é obrigatória' }
  }

  const dataObj = new Date(data + 'T00:00:00')
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  if (dataObj < hoje) {
    return {
      isValid: false,
      message: 'Data não pode ser no passado',
    }
  }

  return { isValid: true }
}

export function validateHorarios(
  horarioInicio: string,
  horarioFim: string
): ValidationResult {
  if (!horarioInicio.trim() || !horarioFim.trim()) {
    return { isValid: false, message: 'Horários são obrigatórios' }
  }

  const [horaInicio, minInicio] = horarioInicio.split(':').map(Number)
  const [horaFim, minFim] = horarioFim.split(':').map(Number)

  const minutoInicio = horaInicio * 60 + minInicio
  const minutoFim = horaFim * 60 + minFim

  if (minutoInicio >= minutoFim) {
    return {
      isValid: false,
      message: 'Horário de início deve ser antes do horário de fim',
    }
  }

  return { isValid: true }
}

export function validateDuracao(duracao: number): ValidationResult {
  if (!duracao || duracao < 15) {
    return {
      isValid: false,
      message: 'Duração deve ser no mínimo 15 minutos',
    }
  }

  if (duracao % 15 !== 0) {
    return {
      isValid: false,
      message: 'Duração deve ser múltiplo de 15 minutos',
    }
  }

  return { isValid: true }
}

export function validateDiasAtendimento(dias: number[]): ValidationResult {
  if (!dias || dias.length === 0) {
    return {
      isValid: false,
      message: 'Selecione pelo menos um dia de atendimento',
    }
  }

  return { isValid: true }
}

export function validateFormularioCliente(formData: {
  nome: string
  sigla: string
  ramo: string
  whatsapp: string
  email: string
  dias_atendimento: number[]
  horario_inicio: string
  horario_fim: string
  duracao_atendimento: number
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  const nomeValidation = validateNome(formData.nome)
  if (!nomeValidation.isValid) errors.nome = nomeValidation.message!

  const siglaValidation = validateSigla(formData.sigla)
  if (!siglaValidation.isValid) errors.sigla = siglaValidation.message!

  const whatsappValidation = validateWhatsApp(formData.whatsapp)
  if (!whatsappValidation.isValid) errors.whatsapp = whatsappValidation.message!

  const emailValidation = validateEmail(formData.email)
  if (!emailValidation.isValid) errors.email = emailValidation.message!

  const diasValidation = validateDiasAtendimento(formData.dias_atendimento)
  if (!diasValidation.isValid)
    errors.dias_atendimento = diasValidation.message!

  const horariosValidation = validateHorarios(
    formData.horario_inicio,
    formData.horario_fim
  )
  if (!horariosValidation.isValid) errors.horarios = horariosValidation.message!

  const duracaoValidation = validateDuracao(formData.duracao_atendimento)
  if (!duracaoValidation.isValid) errors.duracao = duracaoValidation.message!

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export function validateFormularioAgendamento(formData: {
  cliente_id: string
  nome_paciente: string
  whatsapp_paciente: string
  data: string
  horario: string
  tipo_atendimento: string
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  if (!formData.cliente_id.trim()) {
    errors.cliente_id = 'Cliente é obrigatório'
  }

  const nomePacienteValidation = validateNome(formData.nome_paciente)
  if (!nomePacienteValidation.isValid)
    errors.nome_paciente = nomePacienteValidation.message!

  const whatsappValidation = validateWhatsApp(formData.whatsapp_paciente)
  if (!whatsappValidation.isValid)
    errors.whatsapp_paciente = whatsappValidation.message!

  const dataValidation = validateData(formData.data)
  if (!dataValidation.isValid) errors.data = dataValidation.message!

  if (!formData.horario.trim()) {
    errors.horario = 'Horário é obrigatório'
  }

  if (!formData.tipo_atendimento.trim()) {
    errors.tipo_atendimento = 'Tipo de atendimento é obrigatório'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
