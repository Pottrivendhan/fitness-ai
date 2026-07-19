from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.utils import convert_object_id, generate_id
from app.config import settings
import logging
import traceback
import asyncio

logger = logging.getLogger(__name__)

class ChatService:
    """AI fitness coach chat assistant service"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.conversations_collection = db.conversations
        self.profiles_collection = db.profiles
        self.health_logs_collection = db.health_logs
        self.workout_plans_collection = db.workout_plans
        self.diet_plans_collection = db.diet_plans
        
    async def create_conversation(self, user_id: str, first_message: str) -> Dict[str, Any]:
        """Create a new chat conversation"""
        # Auto-title based on the first user message
        title = first_message.strip()
        if len(title) > 30:
            title = title[:27] + "..."
        if not title:
            title = "New Conversation"
            
        convo_id = generate_id()
        convo_doc = {
            "conversation_id": convo_id,
            "user_id": ObjectId(user_id),
            "title": title,
            "messages": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.conversations_collection.insert_one(convo_doc)
        return convert_object_id(convo_doc)
        
    async def get_conversations(self, user_id: str, search_query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve user's chat conversations list, optionally filtered by title search"""
        filter_dict = {"user_id": ObjectId(user_id)}
        
        if search_query and search_query.strip():
            filter_dict["title"] = {"$regex": search_query.strip(), "$options": "i"}
            
        conversations = []
        async for convo in self.conversations_collection.find(filter_dict).sort("updated_at", -1):
            conversations.append(convert_object_id(convo))
        return conversations
        
    async def get_conversation(self, user_id: str, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get details and messages of a specific conversation"""
        convo = await self.conversations_collection.find_one({
            "conversation_id": conversation_id,
            "user_id": ObjectId(user_id)
        })
        if convo:
            return convert_object_id(convo)
        return None
        
    async def delete_conversation(self, user_id: str, conversation_id: str) -> bool:
        """Delete a chat conversation"""
        result = await self.conversations_collection.delete_one({
            "conversation_id": conversation_id,
            "user_id": ObjectId(user_id)
        })
        return result.deleted_count > 0
        
    async def rename_conversation(self, user_id: str, conversation_id: str, title: str) -> Optional[Dict[str, Any]]:
        """Rename a conversation title"""
        clean_title = title.strip()
        if not clean_title:
            clean_title = "Untitled Conversation"
            
        result = await self.conversations_collection.find_one_and_update(
            {"conversation_id": conversation_id, "user_id": ObjectId(user_id)},
            {
                "$set": {
                    "title": clean_title,
                    "updated_at": datetime.utcnow()
                }
            },
            return_document=True
        )
        if result:
            return convert_object_id(result)
        return None
        
    async def toggle_message_reaction(
        self, user_id: str, conversation_id: str, msg_idx: int, reaction_type: str, status: bool
    ) -> Optional[Dict[str, Any]]:
        """Toggle like/dislike reaction on a specific chat message"""
        convo = await self.conversations_collection.find_one({
            "conversation_id": conversation_id,
            "user_id": ObjectId(user_id)
        })
        if not convo or "messages" not in convo or msg_idx >= len(convo["messages"]):
            return None
            
        field_to_set = f"messages.{msg_idx}.{reaction_type}"
        opp_field = f"messages.{msg_idx}.dislike" if reaction_type == "like" else f"messages.{msg_idx}.like"
        
        # If setting this reaction to true, unset the opposite reaction
        update_doc = {"$set": {field_to_set: status}}
        if status:
            update_doc["$set"][opp_field] = False
            
        updated = await self.conversations_collection.find_one_and_update(
            {"_id": convo["_id"]},
            update_doc,
            return_document=True
        )
        return convert_object_id(updated)

    async def process_chat_message(self, user_id: str, message: str, conversation_id: Optional[str] = None, attachments: Optional[List[Any]] = None) -> Dict[str, Any]:
        """Fetch health data, compile AI prompt context, generate simulator response, and save dialogue"""
        logger.info(f"Chat message received from user {user_id} in conversation {conversation_id or 'new'}: '{message[:50]}'")
        # 1. Fetch user health profile context
        profile = await self.profiles_collection.find_one({"user_id": ObjectId(user_id)})
        user = await self.db.users.find_one({"_id": ObjectId(user_id)})
        user_name = user.get("name", "User") if user else "User"
        
        # Fetch today's health logs
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_log = await self.health_logs_collection.find_one({
            "user_id": ObjectId(user_id),
            "log_date": {"$gte": today_start}
        })
        
        # Fetch today's workout plan
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        workout_plan = await self.workout_plans_collection.find_one({
            "user_id": ObjectId(user_id),
            "date": today_str
        })
        
        # Fetch today's diet plan
        diet_plan = await self.diet_plans_collection.find_one({
            "user_id": ObjectId(user_id),
            "date": today_str
        })
        
        # Fetch latest BMI history item
        latest_bmi = await self.db.bmi_history.find_one(
            {"user_id": ObjectId(user_id)},
            sort=[("created_at", -1)]
        )
        
        # Fetch latest Calorie history item
        latest_calorie = await self.db.calorie_history.find_one(
            {"user_id": ObjectId(user_id)},
            sort=[("created_at", -1)]
        )
        
        # Build prompt context values
        weight = profile.get("weight", 70.0) if profile else 70.0
        height = profile.get("height", 175.0) if profile else 175.0
        goal = (profile.get("goal") or profile.get("fitness_goal") or "Maintain") if profile else "Maintain"
        activity_level = profile.get("activity_level", "sedentary") if profile else "sedentary"
        
        # BMI Calculation
        bmi_val = 22.0
        bmi_cat = "Normal Weight"
        if latest_bmi:
            bmi_val = latest_bmi.get("bmi", 22.0)
            bmi_cat = latest_bmi.get("category", "Normal Weight")
        elif height > 0:
            bmi_val = round(weight / ((height / 100) ** 2), 1)
            if bmi_val < 18.5:
                bmi_cat = "Underweight"
            elif bmi_val < 25:
                bmi_cat = "Normal Weight"
            elif bmi_val < 30:
                bmi_cat = "Overweight"
            else:
                bmi_cat = "Obese"
                
        # Recommended Calories
        rec_calories = 2000
        if latest_calorie:
            if "loss" in goal.lower():
                rec_calories = latest_calorie.get("weight_loss_calories", 2000)
            elif "gain" in goal.lower() or "muscle" in goal.lower():
                rec_calories = latest_calorie.get("weight_gain_calories", 2000)
            else:
                rec_calories = latest_calorie.get("maintenance_calories", 2000)
        elif profile:
            rec_calories = profile.get("daily_calorie_goal", 2000)
            
        # Today's Logs Context
        logged_water = today_log.get("water_intake", 0) if today_log else 0
        logged_steps = today_log.get("steps", 0) if today_log else 0
        logged_sleep = today_log.get("sleep_hours", 0) if today_log else 0
        logged_cals = today_log.get("calories_consumed", 0) if today_log else 0
        
        # Workout completion context
        workout_name = "Rest Day Stretch"
        workout_completed = False
        workout_pct = 0.0
        if workout_plan:
            workout_name = workout_plan.get("name", "Daily Workout")
            workout_completed = workout_plan.get("is_completed", False)
            if workout_completed:
                workout_pct = 100.0
            else:
                exercises = workout_plan.get("exercises", [])
                completed_exs = sum(1 for ex in exercises if ex.get("is_completed", False))
                if exercises:
                    workout_pct = round((completed_exs / len(exercises)) * 100, 1)
                    
        # Diet completion context
        diet_completed_meals = 0
        diet_total_meals = 0
        diet_pct = 0.0
        if diet_plan:
            meals = diet_plan.get("meals", {})
            diet_total_meals = len(meals)
            diet_completed_meals = sum(1 for m in meals.values() if m.get("is_completed", False))
            if diet_total_meals > 0:
                diet_pct = round((diet_completed_meals / diet_total_meals) * 100, 1)
                
        # Tracking Streak
        streak = await self.get_streak_count(user_id)
        
        daily_water_goal = profile.get("daily_water_goal", 2000) if profile else 2000
        sleep_goal = profile.get("sleep_goal", 8) if profile else 8
        daily_step_goal = profile.get("daily_step_goal", 10000) if profile else 10000

        # Pack context
        context = {
            "name": user_name,
            "age": profile.get("age", "N/A") if profile else "N/A",
            "gender": profile.get("gender", "N/A") if profile else "N/A",
            "medical_conditions": (profile.get("medical_conditions") or profile.get("health_conditions") or "None") if profile else "None",
            "weight": weight,
            "height": height,
            "goal": goal,
            "activity_level": activity_level,
            "bmi": bmi_val,
            "bmi_category": bmi_cat,
            "calorie_goal": rec_calories,
            "logged_water": logged_water,
            "logged_steps": logged_steps,
            "logged_sleep": logged_sleep,
            "logged_cals": logged_cals,
            "workout_name": workout_name,
            "workout_completed": workout_completed,
            "workout_percentage": workout_pct,
            "diet_completed_meals": diet_completed_meals,
            "diet_total_meals": diet_total_meals,
            "diet_percentage": diet_pct,
            "streak": streak,
            "daily_water_goal": daily_water_goal,
            "sleep_goal": sleep_goal,
            "daily_step_goal": daily_step_goal
        }
        
        # Get history from existing conversation if it exists
        messages_history = []
        if conversation_id and conversation_id.strip():
            convo_exist = await self.conversations_collection.find_one({"conversation_id": conversation_id})
            if convo_exist:
                messages_history = convo_exist.get("messages", [])

        # 2. Generate response using contextual AI / simulator
        ai_response_dict = await self._generate_ai_coach_response(message, context, messages_history, attachments)
        assistant_response = ai_response_dict["response"]
        follow_ups = ai_response_dict["follow_ups"]
        logger.info(f"Chat message processed successfully for user {user_id}. Response: '{assistant_response[:50]}'")
        
        # 3. Retrieve or create conversation
        if not conversation_id or not conversation_id.strip():
            # Create new conversation
            convo = await self.create_conversation(user_id, message)
            convo_id = convo["conversation_id"]
            convo_title = convo["title"]
        else:
            convo_id = conversation_id
            convo_exist = await self.conversations_collection.find_one({"conversation_id": convo_id})
            convo_title = convo_exist["title"] if convo_exist else "Fitness Coach Chat"

        # Append messages
        user_message_node = {
            "sender": "user",
            "message": message,
            "timestamp": datetime.utcnow(),
            "attachments": [att.model_dump() if hasattr(att, "model_dump") else att for att in attachments] if attachments else []
        }
        assistant_message_node = {
            "sender": "assistant",
            "message": assistant_response,
            "follow_up_questions": follow_ups,
            "timestamp": datetime.utcnow(),
            "like": False,
            "dislike": False
        }
        
        await self.conversations_collection.update_one(
            {"conversation_id": convo_id, "user_id": ObjectId(user_id)},
            {
                "$push": {"messages": {"$each": [user_message_node, assistant_message_node]}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Get message index for reaction hooks
        updated_convo = await self.conversations_collection.find_one({"conversation_id": convo_id})
        msg_idx = len(updated_convo.get("messages", [])) - 1 if updated_convo else 0
        
        return {
            "conversation_id": convo_id,
            "conversation_title": convo_title,
            "user_message": message,
            "assistant_response": assistant_response,
            "follow_up_questions": follow_ups,
            "msg_index": msg_idx,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def _generate_ai_coach_response(self, user_message: str, context: Dict[str, Any], history: List[Dict[str, Any]], attachments: Optional[List[Any]] = None) -> Dict[str, Any]:
        """Attempt to generate response using Gemini, falling back to simulated coach on failure or if keys are missing."""
        import json
        import os
        
        system_prompt = f"""You are Jarvis, an elite certified fitness coach, nutritionist, personal trainer and wellness expert.
Behave exactly like ChatGPT.
Never answer using predefined templates. Always generate fresh, unique answers.
Be conversational. Ask follow-up questions. Remember previous conversation history.
Use markdown. Use headings, bullet lists, and tables when necessary. Use emojis naturally.

If the user asks about:
- Workout: Create a customized workout.
- Diet: Create a personalized meal plan.
- Protein: Calculate protein based on weight (typically 1.6-2.2g per kg of bodyweight depending on activity).
- Calories: Explain TDEE (Total Daily Energy Expenditure) and maintenance calories.
- BMI: Explain BMI.
- Water: Calculate hydration.
- Sleep: Give personalized recovery advice.
- Supplements: Explain pros and cons of gym supplements.
- Medical questions: Recommend consulting a healthcare professional when appropriate.
If the user asks unrelated questions, still answer naturally.

User Profile:
- Name: {context.get('name', 'User')}
- Age: {context.get('age', 'N/A')} years
- Gender: {context.get('gender', 'N/A')}
- Height: {context.get('height', 175.0)} cm
- Weight: {context.get('weight', 70.0)} kg
- BMI: {context.get('bmi', 22.0)} ({context.get('bmi_category', 'Normal Weight')})
- Goal: {context.get('goal', 'Maintain')}
- Activity Level: {context.get('activity_level', 'sedentary')}
- Daily Calories Goal: {context.get('calorie_goal', 2000)} kcal
- Water Goal: {context.get('daily_water_goal', 2000)} ml
- Sleep Goal: {context.get('sleep_goal', 8)} hours
- Step Goal: {context.get('daily_step_goal', 10000)} steps
- Medical Conditions: {context.get('medical_conditions', 'None')}

Today's Progress:
- Calories Consumed: {context.get('logged_cals', 0)} kcal
- Water Intake: {context.get('logged_water', 0)} ml
- Sleep Hours: {context.get('logged_sleep', 0)} hours
- Steps: {context.get('logged_steps', 0)} steps
- Workout Completion: {context.get('workout_name', 'Rest Day Stretch')} - {context.get('workout_percentage', 0.0)}% completed
- Diet Completion: {context.get('diet_completed_meals', 0)} of {context.get('diet_total_meals', 0)} meals completed ({context.get('diet_percentage', 0.0)}%)
- Current Streak: {context.get('streak', 0)} days

Response Format:
You MUST respond strictly with a valid JSON object containing exactly two keys:
1. "response": your main conversational coach reply in markdown format.
2. "follow_ups": a list of 3 short follow-up questions to keep the conversation going.
Do not wrap your JSON in triple backticks or markdown tags. Just return the raw JSON object string.
"""

        # Try Gemini first if key is present
        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                
                # Configure the generative model
                model = genai.GenerativeModel(
                    model_name='gemini-2.5-flash',
                    system_instruction=system_prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                
                # Map history
                contents = []
                for msg in history:
                    if msg["sender"] == "user":
                        text_parts = msg["message"]
                        if msg.get("attachments"):
                            att_desc = ", ".join([f"{att['filename']} ({att['type']})" for att in msg["attachments"]])
                            text_parts = f"{text_parts}\n[Attached documents/files: {att_desc}]"
                        contents.append({"role": "user", "parts": [text_parts]})
                    else:
                        msg_json = {
                            "response": msg["message"],
                            "follow_ups": msg.get("follow_up_questions", [])
                        }
                        contents.append({"role": "model", "parts": [json.dumps(msg_json)]})
                
                # Process current parts
                current_parts = []
                current_images = []
                current_docs_text = []
                
                if attachments:
                    for att in attachments:
                        att_dict = att.model_dump() if hasattr(att, "model_dump") else att
                        file_id = att_dict["file_id"]
                        filename = att_dict["filename"]
                        mime_type = att_dict["type"]
                        
                        if mime_type.startswith("image/"):
                            img_path = os.path.join("uploads/images", file_id)
                            if os.path.exists(img_path):
                                try:
                                    from PIL import Image
                                    pil_img = Image.open(img_path)
                                    current_images.append(pil_img)
                                except Exception as e:
                                    logger.error(f"Error opening image {img_path}: {str(e)}")
                        else:
                            doc_text = self._extract_document_text(file_id, filename)
                            if doc_text:
                                current_docs_text.append(f"--- DOCUMENT CONTENT ({filename}) ---\n{doc_text}\n--- END DOCUMENT ---")
                
                final_user_prompt = user_message or ""
                if current_docs_text:
                    docs_block = "\n\n".join(current_docs_text)
                    final_user_prompt = f"{final_user_prompt}\n\n{docs_block}".strip()
                
                # If both are empty (e.g. image only with no text prompt)
                if not final_user_prompt and current_images:
                    final_user_prompt = "Identify this image, explain its content, nutrition or progress details, and advise me."
                
                for img in current_images:
                    current_parts.append(img)
                
                if final_user_prompt:
                    current_parts.append(final_user_prompt)
                
                contents.append({"role": "user", "parts": current_parts})
                
                # Generate content with timeout of 30 seconds and retry up to 3 times
                max_retries = 3
                retry_delay = 2
                response = None
                for attempt in range(max_retries):
                    try:
                        # Use asyncio.to_thread to run the synchronous SDK call in a separate thread
                        response = await asyncio.wait_for(
                            asyncio.to_thread(model.generate_content, contents),
                            timeout=30.0
                        )
                        break
                    except asyncio.TimeoutError:
                        logger.warning(f"Gemini API request timed out on attempt {attempt + 1}")
                        if attempt == max_retries - 1:
                            raise
                    except Exception as e:
                        err_msg = str(e).lower()
                        if "429" in err_msg or "resource_exhausted" in err_msg or "quota" in err_msg:
                            logger.warning(f"Gemini API quota exceeded/rate limited on attempt {attempt + 1}")
                            if attempt < max_retries - 1:
                                await asyncio.sleep(retry_delay * (2 ** attempt))
                                continue
                        logger.error(f"Gemini API attempt {attempt + 1} failed: {str(e)}")
                        if attempt == max_retries - 1:
                            raise
                        await asyncio.sleep(retry_delay)

                text = response.text.strip()
                
                # Clean up any potential markdown wraps
                if text.startswith("```json"):
                    text = text[7:]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
                
                try:
                    data = json.loads(text)
                    if "response" in data and "follow_ups" in data:
                        return data
                except Exception:
                    # If JSON parsing failed, return text directly and create default followups
                    return {
                        "response": response.text,
                        "follow_ups": [
                            "How does this recommendation align with your daily calorie goal?",
                            "Would you like me to adjust the difficulty of this workout?",
                            "Do you want to log any of this progress to your tracker?"
                        ]
                    }
            except Exception as e:
                logger.error(f"Gemini 2.5 flash generation failure, falling back: {traceback.format_exc()}")
        
        # Try OpenAI next if key is present
        if settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                
                docs_block = ""
                if attachments:
                    doc_texts = []
                    for att in attachments:
                        att_dict = att.model_dump() if hasattr(att, "model_dump") else att
                        if not att_dict["type"].startswith("image/"):
                            txt = self._extract_document_text(att_dict["file_id"], att_dict["filename"])
                            if txt:
                                doc_texts.append(txt)
                    if doc_texts:
                        docs_block = "\n\n" + "\n\n".join(doc_texts)
                
                prompt = f"{system_prompt}\nUser Message: {user_message}{docs_block}"
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=1000
                )
                text = response.choices[0].message.content.strip()
                if text.startswith("```json"):
                    text = text[7:]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
                try:
                    data = json.loads(text)
                    if "response" in data and "follow_ups" in data:
                        return data
                except Exception:
                    pass
                return {"response": response.choices[0].message.content, "follow_ups": [
                    "Can you suggest a workout routine?",
                    "What foods are high in protein?",
                    "How can I sleep better?"
                ]}
            except Exception as e:
                logger.error(f"OpenAI generation failure, falling back: {traceback.format_exc()}")

        # If no keys or all failed, fall back to simulated coach
        return self._generate_simulated_coach_response(user_message, context)

    def _extract_document_text(self, file_id: str, filename: str) -> str:
        """Extract text content from uploaded document formats for generative prompts."""
        import os
        file_path = os.path.join("uploads/chat", file_id)
        if not os.path.exists(file_path):
            return ""
        
        _, ext = os.path.splitext(filename.lower())
        text_content = ""
        
        try:
            if ext == ".pdf":
                import pypdf
                reader = pypdf.PdfReader(file_path)
                pages_text = []
                for page in reader.pages:
                    t = page.extract_text()
                    if t:
                        pages_text.append(t)
                text_content = "\n".join(pages_text)
                
            elif ext == ".docx":
                import docx
                doc = docx.Document(file_path)
                paragraphs = [p.text for p in doc.paragraphs]
                text_content = "\n".join(paragraphs)
                
            elif ext == ".csv":
                import pandas as pd
                df = pd.read_csv(file_path)
                text_content = df.to_string()
                
            elif ext == ".xlsx":
                import pandas as pd
                df = pd.read_excel(file_path)
                text_content = df.to_string()
                
            elif ext == ".txt":
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    text_content = f.read()
        except Exception as e:
            logger.error(f"Error parsing document {filename} ({file_id}): {str(e)}")
            text_content = f"[Error parsing document file {filename}]"
            
        return text_content

    def _generate_simulated_coach_response(self, user_message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate a certified fitness coach utilizing real-world profile metrics"""
        msg = user_message.lower()
        
        # Extract context fields for cleaner mapping
        weight = context["weight"]
        height = context["height"]
        goal = context["goal"]
        bmi = context["bmi"]
        bmi_val = context["bmi"]
        bmi_cat = context["bmi_category"]
        calorie_goal = context["calorie_goal"]
        logged_water = context["logged_water"]
        logged_steps = context["logged_steps"]
        logged_sleep = context["logged_sleep"]
        logged_cals = context["logged_cals"]
        workout_name = context["workout_name"]
        workout_pct = context["workout_percentage"]
        workout_completed = context["workout_completed"]
        diet_pct = context["diet_percentage"]
        streak = context["streak"]
        daily_water_goal = context.get("daily_water_goal", 2000)
        sleep_goal = context.get("sleep_goal", 8)
        daily_step_goal = context.get("daily_step_goal", 10000)
        
        # Initialize default response structure segments
        summary = ""
        recs = []
        nutrition = ""
        workout = ""
        tips = []
        warnings = []
        motivation = ""
        
        # Determine follow-ups
        follow_ups = [
            "Can you write a detailed workout plan for me?",
            "What protein foods do you suggest?",
            "How can I improve my sleep?"
        ]

        # Match questions & write tailored responses
        if any(w in msg for w in ["workout", "exercise", "routine", "train"]):
            summary = f"💪 Let's talk about your fitness training! Your current goal is set to **{goal}**, and today you've completed **{workout_pct}%** of your scheduled **{workout_name}** workout."
            recs = [
                "Aim to complete 100% of your daily workout planner items to keep your momentum high.",
                "Ensure a structured 5-minute warm-up consisting of arm swings, leg kicks, and bodyweight squats before moving to high-intensity training.",
                "To optimize muscle growth and recovery, lift with weights that allow you to reach mechanical failure within 8-12 repetitions."
            ]
            nutrition = f"🍳 Muscle fibers require amino acids to repair. Keep your protein high. With your daily calorie goal at **{calorie_goal} kcal**, strive for a protein intake of about 1.6 to 2.2 grams per kilogram of body weight."
            
            if workout_completed:
                workout = f"🏋️ Excellent job! You've already completed today's workout (**{workout_name}**). For your next session, implement progressive overload by adding 2.5kg or 1 extra rep to your primary compound lifts."
            else:
                workout = f"🏋️ Today's program calls for **{workout_name}** (Difficulty: Intermediate). You have completed **{workout_pct}%** of it. I recommend blocking out 20 minutes this evening to complete the rest of your sets."
                
            tips = [
                "Log your workout sets in the planner to keep track of your performance numbers.",
                "Sip water between sets to maintain hydration during high-intensity lifting blocks."
            ]
            warnings = [
                "Do not sacrifice lifting form to lift heavier weight. Lower back injuries are common with poor squatting technique.",
                "Rest days are not optional. If you feel excessive muscle soreness, switch to a low-intensity active recovery stretch."
            ]
            motivation = f"🔥 Your tracking consistency streak is currently **{streak} days**. Consistency is what separates wishes from achievements. Let's make today count!"
            follow_ups = [
                "What exercises are in today's workout?",
                "Can you suggest a quick 15-minute home workout?",
                "How many rest days should I take per week?"
            ]
            
        elif any(w in msg for w in ["breakfast", "meal", "diet", "eat", "protein", "food", "nutrition"]):
            summary = f"🥗 Nutrition is 80% of your fitness success! Since your goal is **{goal}**, your daily target is **{calorie_goal} kcal**. Today you have consumed **{logged_cals} kcal** and finished **{context['diet_completed_meals']} of {context['diet_total_meals']}** meals."
            recs = [
                "Prioritize whole, single-ingredient foods to maximize vitamin and mineral density.",
                "Include a clean protein source in every single meal to increase satiety and protect lean mass.",
                "Stay within a 200-300 kcal window of your daily target to guarantee progress without extreme dieting stress."
            ]
            
            if "loss" in goal.lower():
                nutrition = "🍳 For a healthy breakfast that aligns with weight loss, try a 3-egg white scramble with fresh baby spinach, mushrooms, and 1 slice of sprouted grain bread (approx. 280 kcal, 26g protein). Keep processed carbs low."
            else:
                nutrition = "🍳 For muscle building and energy, try a loaded oatmeal bowl: 60g rolled oats, 1 scoop of whey protein, 1 sliced banana, and 1 tablespoon of almond butter (approx. 520 kcal, 35g protein)."
                
            workout = "🏋️ Training on an empty stomach can lower peak performance. Have a small, fast-digesting carb block (like a banana or rice cake) 30-40 minutes before hitting the gym."
            tips = [
                "Prepare your meals in advance on Sunday to avoid impulse eating during busy workdays.",
                "Drink 1 glass of water 15 minutes before your meals to naturally prevent overeating."
            ]
            warnings = [
                "Beware of liquid calories. Juices, sodas, and heavy creamer coffees can quickly blow past your daily calorie target.",
                "Cutting healthy fats too low can disrupt hormone balance. Ensure 20% of your calories come from clean fats like avocados and nuts."
            ]
            motivation = f"💪 Meal-by-meal consistency creates results. You are tracking **{diet_pct}%** of your target meals today. Stay disciplined, you've got this!"
            follow_ups = [
                "Suggest vegetarian protein foods.",
                "How do I structure my daily macros?",
                "What is a good post-workout meal?"
            ]
            
        elif any(w in msg for w in ["bmi", "weight", "lose", "gain", "deficit"]):
            summary = f"📊 Let's analyze your weight metrics. Your current BMI is **{bmi}**, placing you in the **{bmi_cat}** category. Height: {height} cm | Weight: {weight} kg. Goal: **{goal}**."
            
            if bmi_val >= 25:
                recs = [
                    f"To drop out of the {bmi_cat} range, aim for a gradual weight loss rate of 0.5 kg per week.",
                    f"Maintain a safe daily calorie deficit of 500 kcal from your TDEE, aiming for a target of **{calorie_goal} kcal**.",
                    "Combine standard resistance training with neat activity (10,000 steps daily) to prevent muscle loss while losing fat."
                ]
                warnings = [
                    "Avoid crash dieting. Cutting calories below 1200 kcal for women or 1500 kcal for men can crash metabolic rate.",
                    "Weight fluctuates daily due to water retention and sodium. Focus on the weekly average trend."
                ]
            else:
                recs = [
                    "Your BMI is in a healthy, normal range! Focus on body recomposition (building muscle while shedding fat).",
                    f"Ensure you fuel your training by eating around your calorie target of **{calorie_goal} kcal**.",
                    "Focus on lifting heavier over time and maintaining standard hydration."
                ]
                warnings = [
                    "Do not rush weight gain. A small calorie surplus of 200-300 kcal is ideal for clean bulking without excess fat storage."
                ]
                
            nutrition = f"🥑 Your calorie target is **{calorie_goal} kcal**. Focus on eating high-fiber foods, lean meats (chicken breast, turkey, fish), and leafy greens to keep hunger under control."
            workout = "🏋️ Strength training prevents your body from burning muscle for fuel when in a calorie deficit. Commit to 3 strength sessions a week."
            tips = [
                "Weigh yourself at the same time in the morning, after using the restroom and before eating.",
                "Take progress photos weekly. The scale doesn't always show the changes in body composition."
            ]
            motivation = "⚡ Weight goals are a marathon, not a sprint. Celebrate small changes. Consistency always wins!"
            follow_ups = [
                "How can I lose 5 kg?",
                "Explain my BMI in detail.",
                "How many calories should I eat to build muscle?"
            ]
            
        elif any(w in msg for w in ["water", "hydration", "drink"]):
            summary = f"💧 Hydration is critical for athletic performance! Your daily water goal is set to **{daily_water_goal} ml**. Today you logged **{logged_water} ml** of water."
            
            remaining = max(0, daily_water_goal - logged_water)
            if remaining > 0:
                recs = [
                    f"You still need to drink **{remaining} ml** of water today to meet your target.",
                    "Drink 1 glass of water immediately upon waking up to jumpstart hydration.",
                    "Sip water continuously instead of chugging large quantities at once to allow better absorption."
                ]
            else:
                recs = [
                    "Fantastic job! You've met your daily water goal of 2,000 ml today!",
                    "Continue monitoring your hydration, especially on hot days or during high-sweat workouts.",
                    "Listen to your body's natural thirst cues to balance intake."
                ]
                
            nutrition = "🍉 Foods like watermelons, cucumbers, and strawberries contain over 90% water and can contribute to your overall daily hydration goals."
            workout = "🏋️ Even mild dehydration (1-2% of body weight loss) can decrease strength and endurance by up to 10-15%. Drink 500ml water 2 hours before training."
            tips = [
                "Keep a reusable water bottle visible at your work desk.",
                "Add lemon, lime, or mint leaves to your water if you prefer some natural flavor."
            ]
            warnings = [
                "Avoid replacing water with carbonated energy drinks or sweet sodas, which contain dehydrating agents.",
                "Extremely pale or clear urine indicates great hydration. Dark amber urine is a warning that you are dehydrated."
            ]
            motivation = "🌟 Small habits yield major health dividends. Drink a glass of water now and keep that consistency high!"
            follow_ups = [
                "How does water affect fat loss?",
                "Is it possible to drink too much water?",
                "Should I drink sports drinks during workouts?"
            ]
            
        elif any(w in msg for w in ["sleep", "rest", "recovery", "tired"]):
            summary = f"😴 Rest is where the magic happens. Your sleep target is **{sleep_goal} hours**. Today you logged **{logged_sleep} hours** of sleep."
            
            if logged_sleep < sleep_goal:
                recs = [
                    "You fell short of your sleep target last night. Focus on getting a full night's rest tonight.",
                    "Keep a strict bedtime schedule: try to lie down within the same 30-minute window daily.",
                    "Create a wind-down routine 1 hour before sleep: dim lights, read a physical book, or stretch."
                ]
            else:
                recs = [
                    "Outstanding! You met your sleep target last night, allowing your body to recover.",
                    "Maintain this sleep schedule, especially during intense training cycles.",
                    "A consistent sleep routine reduces morning grogginess."
                ]
                
            nutrition = "🍒 Avoid eating large, heavy meals within 2 hours of sleeping. Cherry juice or magnesium-rich foods like pumpkin seeds can support natural melatonin levels."
            workout = "🏋️ Lack of sleep reduces central nervous system output, increasing injury risk and decreasing maximum lifting power. Reduce lifting weights slightly today if you feel excessively fatigued."
            tips = [
                "Keep your bedroom cool (around 18-20°C / 65-68°F) for optimal deep sleep cycles.",
                "Turn off your phone or use a blue-light blocking filter after sunset."
            ]
            warnings = [
                "Caffeine has a half-life of 6 hours. Avoid coffee, tea, or pre-workout supplements after 2:00 PM.",
                "Using alcohol as a sleep aid destroys REM sleep quality, leaving you waking up tired."
            ]
            motivation = f"⚡ Recovery is just as important as the workout. Sleep is your ultimate legal performance enhancer. Prioritize rest tonight!"
            follow_ups = [
                "How does sleep affect muscle growth?",
                "What is a good wind-down routine?",
                "How does caffeine affect sleep quality?"
            ]
            
        else:
            # General Question
            summary = f"👋 Hello! I am your AI Fitness Coach. I'm here to analyze your metrics and help you stay on track! Current Goal: **{goal}** | Streak: **{streak} days**."
            recs = [
                f"Aim for your recommended calorie intake of **{calorie_goal} kcal** daily.",
                f"Aim to walk **{daily_step_goal} steps** and drink **{daily_water_goal} ml** of water daily.",
                "Consistently log your weight, sleep, and workouts so I can provide highly customized insights."
            ]
            nutrition = f"🥗 Structure your meals around lean proteins, high-fiber complex carbohydrates (sweet potatoes, oats), and healthy monounsaturated fats. Today's calorie target: **{calorie_goal} kcal**."
            workout = f"🏋️ Your current daily workout plan is **{workout_name}**. Try to log your exercises in the tracker as you complete them to build your tracking streak."
            tips = [
                "Take things one day at a time. Consistency beats intensity every single time.",
                "Set reminders to drink water and log your progress before going to sleep."
            ]
            warnings = [
                "Be mindful of creeping portion sizes. Weighing food on a scale is the most accurate way to trace calories.",
                "Listen to joint pain. If a workout hurts, stop and ask me for alternative exercises."
            ]
            motivation = f"🔥 You have tracked your habits for a streak of **{streak} days**. Every positive choice you make today is an investment in your future self. Let's make it a great day!"
            follow_ups = [
                "Create a workout for today.",
                "Explain my BMI.",
                "How many calories should I eat to lose weight?"
            ]

        # Format Response using standard markdown sections with emojis
        response_str = f"""### 📝 Summary
{summary}

---

### 📋 Recommendations
{chr(10).join(f"- {r}" for r in recs)}

---

### 🥗 Nutrition Advice
{nutrition}

---

### 🏋️ Workout Plan
{workout}

---

### 💡 Lifestyle Tips
{chr(10).join(f"- {t}" for t in tips)}

---

### ⚠️ Warnings & Precautions
{chr(10).join(f"- {w}" for w in warnings)}

---

### 🔥 Motivation
{motivation}"""

        return {
            "response": response_str,
            "follow_ups": follow_ups
        }
        
    async def get_streak_count(self, user_id: str) -> int:
        """Get workout/tracking streak count"""
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        streak = 0
        
        for i in range(365):  # Check up to 1 year
            check_date = today - timedelta(days=i)
            log = await self.health_logs_collection.find_one({
                "user_id": ObjectId(user_id),
                "log_date": {
                    "$gte": check_date,
                    "$lt": check_date + timedelta(days=1)
                }
            })
            
            if log:
                streak += 1
            else:
                break
        
        return streak
