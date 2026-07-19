import React, { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setUser } from '@/store/slices/authSlice'
import { useAuth } from '@/hooks'
import { Card, Input, Select, Button } from '@/components'
import apiService from '@/services/api'
import { UserProfile } from '@/types'
import { FaUpload, FaUser, FaInfoCircle, FaWeight, FaRunning } from 'react-icons/fa'

const Profile = () => {
  const { user } = useAuth()
  const dispatch = useDispatch()
  
  // Loading & State Banners
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isNewProfile, setIsNewProfile] = useState(false)

  // Profile Form Fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [age, setAge] = useState<number>(25)
  const [gender, setGender] = useState('Male')
  const [height, setHeight] = useState<number>(170)
  const [weight, setWeight] = useState<number>(70)
  const [bloodGroup, setBloodGroup] = useState('O+')
  const [medicalConditionsInput, setMedicalConditionsInput] = useState('')
  const [goal, setGoal] = useState<'Weight Loss' | 'Weight Gain' | 'Muscle Gain' | 'Maintain'>('Maintain')
  const [activityLevel, setActivityLevel] = useState<'Sedentary' | 'Light' | 'Moderate' | 'Active'>('Moderate')

  // Future-proof Goals
  const [dailyStepGoal, setDailyStepGoal] = useState<number>(10000)
  const [dailyWaterGoal, setDailyWaterGoal] = useState<number>(2000)
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState<number>(2000)
  const [sleepGoal, setSleepGoal] = useState<number>(8)
  const [targetWeight, setTargetWeight] = useState<number>(70)

  // Image Upload States
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  // Validation Errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Real-time BMI calculation
  const calculatedBmi = height > 0 ? parseFloat((weight / ((height / 100) ** 2)).toFixed(2)) : 0

  // Get BMI Category and colors
  const getBmiInfo = (bmi: number) => {
    if (bmi < 18.5) {
      return { category: 'Underweight', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' }
    } else if (bmi < 25) {
      return { category: 'Normal', color: 'text-green-500 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800' }
    } else if (bmi < 30) {
      return { category: 'Overweight', color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800' }
    } else {
      return { category: 'Obese', color: 'text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800' }
    }
  }

  const bmiInfo = getBmiInfo(calculatedBmi)

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        if (user) {
          setName(user.name || '')
          setEmail(user.email || '')
          if (user.avatar_url) {
            setImagePreview(user.avatar_url)
          }
        }
        
        const profileData = await apiService.getProfile()
        if (profileData) {
          setName(profileData.name || user?.name || '')
          setAge(profileData.age || 25)
          setGender(profileData.gender || 'Male')
          setHeight(profileData.height || 170)
          setWeight(profileData.weight || 70)
          setBloodGroup(profileData.blood_group || 'O+')
          setGoal(profileData.goal || 'Maintain')
          setActivityLevel(profileData.activity_level || 'Moderate')
          setMedicalConditionsInput((profileData.medical_conditions || []).join(', '))
          
          setDailyStepGoal(profileData.daily_step_goal || 10000)
          setDailyWaterGoal(profileData.daily_water_goal || 2000)
          setDailyCalorieGoal(profileData.daily_calorie_goal || 2000)
          setSleepGoal(profileData.sleep_goal || 8)
          setTargetWeight(profileData.target_weight || profileData.weight || 70)
          setIsNewProfile(false)
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          // Profile does not exist yet
          setIsNewProfile(true)
        } else {
          setErrorMessage('Failed to load profile details')
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [user])

  // Canvas Image Compression (Front-end image compression for files > 2 MB)
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          // Max dimension limit
          const MAX_DIM = 1200
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width)
              width = MAX_DIM
            } else {
              width = Math.round((width * MAX_DIM) / height)
              height = MAX_DIM
            }
          }
          
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                resolve(file)
              }
            },
            file.type,
            0.8 // 80% quality compression quality
          )
        }
        img.onerror = (err) => reject(err)
      }
      reader.onerror = (err) => reject(err)
    })
  }

  // Handle Photo Picker Selection
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Extension verification
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Invalid file format. Only JPG, PNG, and WEBP are allowed.')
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)

    // Show Preview instantly
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)

    try {
      let finalFile = file
      if (file.size > 2 * 1024 * 1024) {
        // Compress image before upload
        finalFile = await compressImage(file)
      }
      
      // Auto-upload picture on selection for best UX
      setIsUploadingImage(true)
      const uploadedUrl = await apiService.uploadAvatar(finalFile)
      
      // Sync globally in Redux immediately
      if (user) {
        dispatch(setUser({
          ...user,
          avatar_url: uploadedUrl
        }))
      }
      setSuccessMessage('Profile photo updated successfully!')
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to upload photo')
    } finally {
      setIsUploadingImage(false)
    }
  }

  // Form Field Validation
  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!name.trim()) errors.name = 'Full Name is required'
    if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters'
    
    if (!age) errors.age = 'Age is required'
    if (age < 13 || age > 120) errors.age = 'Age must be between 13 and 120'
    
    if (!height) errors.height = 'Height is required'
    if (height <= 0) errors.height = 'Height must be greater than 0'
    
    if (!weight) errors.weight = 'Weight is required'
    if (weight <= 0) errors.weight = 'Weight must be greater than 0'
    
    if (!dailyStepGoal || dailyStepGoal <= 0) errors.dailyStepGoal = 'Step goal must be positive'
    if (!dailyWaterGoal || dailyWaterGoal <= 0) errors.dailyWaterGoal = 'Water goal must be positive'
    if (!dailyCalorieGoal || dailyCalorieGoal <= 0) errors.dailyCalorieGoal = 'Calorie goal must be positive'
    
    if (!sleepGoal) errors.sleepGoal = 'Sleep goal is required'
    if (sleepGoal < 4 || sleepGoal > 12) errors.sleepGoal = 'Sleep goal must be between 4 and 12 hours'
    
    if (targetWeight <= 0) errors.targetWeight = 'Target weight must be greater than 0'

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle Form Submission
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!validateForm()) {
      setErrorMessage('Please fix the validation errors before saving')
      return
    }

    try {
      setIsSaving(true)
      
      const medicalConditions = medicalConditionsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '')

      const profilePayload: Partial<UserProfile> = {
        name,
        email,
        age,
        gender: gender as any,
        height,
        weight,
        blood_group: bloodGroup,
        medical_conditions: medicalConditions,
        goal,
        activity_level: activityLevel,
        daily_step_goal: dailyStepGoal,
        daily_water_goal: dailyWaterGoal,
        daily_calorie_goal: dailyCalorieGoal,
        sleep_goal: sleepGoal,
        target_weight: targetWeight
      }

      let updatedProfile: UserProfile
      if (isNewProfile) {
        updatedProfile = await apiService.createProfile(profilePayload)
        setIsNewProfile(false)
        setSuccessMessage('Profile created successfully!')
      } else {
        updatedProfile = await apiService.updateProfile(profilePayload)
        setSuccessMessage('Profile updated successfully!')
      }

      // Automatically updates welcome messages and profile photo instantly in headers/sidebars
      if (user) {
        dispatch(setUser({
          ...user,
          name: updatedProfile.name,
          avatar_url: updatedProfile.avatar_url || user.avatar_url
        }))
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to save profile changes')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className='p-8 max-w-6xl mx-auto space-y-6 animate-pulse'>
        <div className='h-12 bg-gray-200 dark:bg-gray-800 rounded w-1/4 mb-8' />
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          <div className='h-80 bg-gray-200 dark:bg-gray-800 rounded' />
          <div className='lg:col-span-2 h-96 bg-gray-200 dark:bg-gray-800 rounded' />
        </div>
      </div>
    )
  }

  return (
    <div className='p-4 md:p-8 max-w-6xl mx-auto'>
      <div className='mb-8'>
        <h1 className='text-3xl md:text-4xl font-extrabold text-gray-950 dark:text-white tracking-tight'>
          Account Profile
        </h1>
        <p className='text-gray-500 dark:text-gray-400 mt-1.5'>
          Manage your personal details, physical measurements, and fitness benchmarks.
        </p>
      </div>

      {/* Success and Error Alerts */}
      {successMessage && (
        <div className='mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 rounded-2xl flex items-center gap-3 font-semibold'>
          <FaInfoCircle className='text-lg flex-shrink-0' />
          <span>{successMessage}</span>
        </div>
      )}
      
      {errorMessage && (
        <div className='mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-2xl flex items-center gap-3 font-semibold'>
          <FaInfoCircle className='text-lg flex-shrink-0' />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className='grid grid-cols-1 lg:grid-cols-3 gap-8 items-start'>
        {/* Column 1: Image Upload & BMI card */}
        <div className='space-y-8'>
          {/* Profile Photo Uploader */}
          <Card className='text-center p-6 bg-white/70 dark:bg-gray-950/70 backdrop-blur border border-gray-150 dark:border-gray-800/80 rounded-3xl shadow-sm'>
            <h2 className='text-lg font-bold text-gray-900 dark:text-white text-left mb-6'>Profile Picture</h2>
            <div className='relative w-36 h-36 mx-auto mb-6 group'>
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt='Preview'
                  className='w-full h-full rounded-full object-cover border-4 border-white dark:border-gray-900 shadow-xl group-hover:opacity-95 transition-opacity'
                />
              ) : (
                <div className='w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-5xl shadow-xl font-bold'>
                  {name ? name.charAt(0).toUpperCase() : <FaUser />}
                </div>
              )}
              {isUploadingImage && (
                <div className='absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white text-xs font-semibold backdrop-blur-sm'>
                  Uploading...
                </div>
              )}
              <label className='absolute bottom-1 right-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all'>
                <FaUpload className='text-sm' />
                <input
                  type='file'
                  accept='.jpg,.jpeg,.png,.webp'
                  onChange={handlePhotoSelect}
                  className='hidden'
                />
              </label>
            </div>
            <p className='text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed'>
              Support JPG, PNG or WEBP files. Client-side compression applied automatically for files larger than 2 MB.
            </p>
          </Card>

          {/* Real-time BMI Display Card */}
          <Card className='p-6 bg-white/70 dark:bg-gray-950/70 backdrop-blur border border-gray-150 dark:border-gray-800/80 rounded-3xl shadow-sm'>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-lg font-bold text-gray-900 dark:text-white'>BMI Status</h2>
              <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${bmiInfo.color}`}>
                {bmiInfo.category}
              </span>
            </div>
            
            <div className='text-center py-4'>
              <span className='text-5xl font-black tracking-tight text-gray-900 dark:text-white bg-gradient-to-br from-gray-950 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent'>
                {calculatedBmi || '0.0'}
              </span>
              <p className='text-gray-500 dark:text-gray-400 text-sm font-semibold mt-2'>Body Mass Index</p>
            </div>

            {/* Visual scale slider */}
            <div className='mt-6 space-y-2'>
              <div className='w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full relative overflow-hidden'>
                {/* Underweight indicator range */}
                <div className='absolute left-0 top-0 bottom-0 w-[40%] bg-blue-400 opacity-30' />
                {/* Normal indicator range */}
                <div className='absolute left-[40%] top-0 bottom-0 w-[20%] bg-green-400 opacity-30' />
                {/* Overweight indicator range */}
                <div className='absolute left-[60%] top-0 bottom-0 w-[20%] bg-orange-400 opacity-30' />
                {/* Obese range */}
                <div className='absolute left-[80%] top-0 bottom-0 w-[20%] bg-red-400 opacity-30' />
                
                {/* calculated pointer marker */}
                {calculatedBmi > 0 && (
                  <div 
                    className='absolute top-0 bottom-0 w-2.5 bg-blue-600 dark:bg-white rounded-full shadow border border-white'
                    style={{ 
                      left: `${Math.min(Math.max(((calculatedBmi - 10) / 30) * 100, 0), 97)}%` 
                    }}
                  />
                )}
              </div>
              
              <div className='flex justify-between text-[10px] font-bold text-gray-400'>
                <span>15.0</span>
                <span>18.5 (Under)</span>
                <span>25.0 (Normal)</span>
                <span>30.0 (Over)</span>
                <span>40.0</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Column 2 & 3: Detailed Profile Fields Form */}
        <div className='lg:col-span-2 space-y-8'>
          <Card className='p-6 md:p-8 bg-white/70 dark:bg-gray-950/70 backdrop-blur border border-gray-150 dark:border-gray-800/80 rounded-3xl shadow-sm space-y-8'>
            
            {/* Section 1: Account & Identity */}
            <div>
              <h3 className='text-md font-bold text-gray-950 dark:text-white flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/50 pb-3 mb-6'>
                <FaUser className='text-blue-500' /> Personal Identification
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <Input
                  label='Full Name'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={validationErrors.name}
                  placeholder='John Doe'
                  required
                />
                <Input
                  label='Email Address (Read-only)'
                  value={email}
                  disabled
                  type='email'
                  hint='Email details are linked to your login credentials.'
                />
              </div>
            </div>

            {/* Section 2: Health & Body Statistics */}
            <div>
              <h3 className='text-md font-bold text-gray-950 dark:text-white flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/50 pb-3 mb-6'>
                <FaWeight className='text-blue-500' /> Body Measurements
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                <Input
                  label='Age'
                  type='number'
                  value={age || ''}
                  onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                  error={validationErrors.age}
                  min={13}
                  max={120}
                  required
                />
                
                <Select
                  label='Gender'
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Other', label: 'Other' }
                  ]}
                  required
                />

                <Select
                  label='Blood Group'
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  options={[
                    { value: 'A+', label: 'A+' },
                    { value: 'A-', label: 'A-' },
                    { value: 'B+', label: 'B+' },
                    { value: 'B-', label: 'B-' },
                    { value: 'AB+', label: 'AB+' },
                    { value: 'AB-', label: 'AB-' },
                    { value: 'O+', label: 'O+' },
                    { value: 'O-', label: 'O-' }
                  ]}
                  required
                />

                <Input
                  label='Height (cm)'
                  type='number'
                  step='0.1'
                  value={height || ''}
                  onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                  error={validationErrors.height}
                  placeholder='175'
                  required
                />

                <Input
                  label='Weight (kg)'
                  type='number'
                  step='0.1'
                  value={weight || ''}
                  onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                  error={validationErrors.weight}
                  placeholder='70'
                  required
                />

                <Input
                  label='Target Weight (kg)'
                  type='number'
                  step='0.1'
                  value={targetWeight || ''}
                  onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)}
                  error={validationErrors.targetWeight}
                  placeholder='65'
                  required
                />
              </div>
            </div>

            {/* Section 3: Lifestyle & Fitness Goals */}
            <div>
              <h3 className='text-md font-bold text-gray-950 dark:text-white flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/50 pb-3 mb-6'>
                <FaRunning className='text-blue-500' /> Fitness & Activity Focus
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
                <Select
                  label='Fitness Goal'
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as any)}
                  options={[
                    { value: 'Weight Loss', label: 'Weight Loss' },
                    { value: 'Weight Gain', label: 'Weight Gain' },
                    { value: 'Muscle Gain', label: 'Muscle Gain' },
                    { value: 'Maintain', label: 'Maintain' }
                  ]}
                  required
                />

                <Select
                  label='Activity Level'
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as any)}
                  options={[
                    { value: 'Sedentary', label: 'Sedentary (Little or no exercise)' },
                    { value: 'Light', label: 'Lightly Active (1-3 days/week)' },
                    { value: 'Moderate', label: 'Moderately Active (3-5 days/week)' },
                    { value: 'Active', label: 'Active (6-7 days/week)' }
                  ]}
                  required
                />
              </div>

              <Input
                label='Medical Conditions'
                value={medicalConditionsInput}
                onChange={(e) => setMedicalConditionsInput(e.target.value)}
                placeholder='E.g., Asthma, Hypertension, Diabetes (separate with commas)'
                hint='Type conditions separated by commas (e.g. Asthma, Knee Injury).'
              />
            </div>

            {/* Section 4: Future-proof AI Coach Benchmarks */}
            <div>
              <h3 className='text-md font-bold text-gray-950 dark:text-white flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/50 pb-3 mb-6'>
                <FaRunning className='text-blue-500' /> Future AI Coach Thresholds
              </h3>
              <p className='text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed'>
                These benchmarks configure the daily recommendations calculated by the AI Fitness Trainer.
              </p>
              
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <Input
                  label='Daily Step Goal'
                  type='number'
                  value={dailyStepGoal || ''}
                  onChange={(e) => setDailyStepGoal(parseInt(e.target.value) || 0)}
                  error={validationErrors.dailyStepGoal}
                  placeholder='10000'
                  required
                />

                <Input
                  label='Daily Water Target (ml)'
                  type='number'
                  value={dailyWaterGoal || ''}
                  onChange={(e) => setDailyWaterGoal(parseInt(e.target.value) || 0)}
                  error={validationErrors.dailyWaterGoal}
                  placeholder='2000'
                  required
                />

                <Input
                  label='Daily Calorie Target (kcal)'
                  type='number'
                  value={dailyCalorieGoal || ''}
                  onChange={(e) => setDailyCalorieGoal(parseInt(e.target.value) || 0)}
                  error={validationErrors.dailyCalorieGoal}
                  placeholder='2000'
                  required
                />

                <Input
                  label='Sleep Duration Target (Hours)'
                  type='number'
                  value={sleepGoal || ''}
                  onChange={(e) => setSleepGoal(parseInt(e.target.value) || 0)}
                  error={validationErrors.sleepGoal}
                  min={4}
                  max={12}
                  placeholder='8'
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className='pt-6 border-t border-gray-200/50 dark:border-gray-800/50 flex justify-end'>
              <Button
                type='submit'
                variant='primary'
                size='lg'
                className='px-8 py-3.5 font-bold shadow-lg shadow-blue-500/20'
                isLoading={isSaving}
              >
                {isNewProfile ? 'Create Profile' : 'Save Changes'}
              </Button>
            </div>

          </Card>
        </div>
      </form>
    </div>
  )
}

export default Profile
