// file: src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User';
import UserPassword from '../models/UserPassword';

// Esquemas de validación con Zod
const registerSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    rol: z.enum(['Profesor', 'Alumno', 'Administrador']).optional().default('Alumno'),
    centro: z.string().nullable().optional()
});

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'La contraseña es requerida')
});

// Función para generar token JWT
const generateToken = (user: { _id: string; email: string; rol: string; centro?: string | null }) => {
    const payload = {
        id_user: user._id,
        email: user.email,
        rol: user.rol,
        centro: user.centro || ''
    };

    return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '7d' });
};

// Función para generar ID único
const generateUserId = () => {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Registro de nuevo usuario
 * POST /api/auth/register
 * 
 * Crea un documento en 'usuarios' y otro en 'usuariosContrasena' (1:1)
 */
export const register = async (req: Request, res: Response) => {
    try {
        // 1. Validar datos de entrada
        const validationResult = registerSchema.safeParse(req.body);

        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Datos inválidos',
                details: validationResult.error.errors
            });
        }

        const { email, password, rol, centro } = validationResult.data;

        // 2. Verificar si el email ya existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // 3. Hashear la contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 4. Generar ID único para ambas colecciones
        const userId = generateUserId();

        // 5. Crear el usuario en la colección 'usuarios'
        const newUser = new User({
            _id: userId,
            email,
            rol: rol || 'Alumno',
            centro: centro || null
        });

        // 6. Crear la contraseña en la colección 'usuariosContrasena'
        const newUserPassword = new UserPassword({
            _id: userId,  // Mismo _id para mantener la relación 1:1
            contrasena: hashedPassword
        });

        // 7. Guardar ambos documentos
        console.log('=== DEBUG: Guardando usuario ===');
        console.log('Usuario a guardar:', JSON.stringify(newUser.toObject(), null, 2));
        await newUser.save();

        console.log('=== DEBUG: Guardando contraseña ===');
        console.log('Password doc a guardar:', JSON.stringify(newUserPassword.toObject(), null, 2));
        console.log('Longitud del hash:', hashedPassword.length);
        await newUserPassword.save();

        // 8. Generar token JWT
        const token = generateToken(newUser);

        // 9. Responder con el token
        return res.status(201).json({
            message: 'Usuario registrado exitosamente',
            token,
            user: {
                id: newUser._id,
                email: newUser.email,
                rol: newUser.rol,
                centro: newUser.centro
            }
        });

    } catch (error: any) {
        console.error('Error en registro:', error);
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);
        return res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
};

/**
 * Login de usuario
 * POST /api/auth/login
 * 
 * Busca en 'usuarios' y verifica la contraseña en 'usuariosContrasena'
 */
export const login = async (req: Request, res: Response) => {
    try {
        // 1. Validar datos de entrada
        const validationResult = loginSchema.safeParse(req.body);

        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Datos inválidos',
                details: validationResult.error.errors
            });
        }

        const { email, password } = validationResult.data;

        // 2. Buscar usuario por email en la colección 'usuarios'
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // 3. Buscar la contraseña en la colección 'usuariosContrasena'
        const userPassword = await UserPassword.findById(user._id);
        if (!userPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // 4. Verificar contraseña
        const isPasswordValid = await bcrypt.compare(password, userPassword.contrasena);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // 5. Generar token JWT
        const token = generateToken(user);

        // 6. Responder con el token
        return res.status(200).json({
            message: 'Login exitoso',
            token,
            user: {
                id: user._id,
                email: user.email,
                rol: user.rol,
                centro: user.centro
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};
